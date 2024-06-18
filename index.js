var cc_token = localStorage["cc_token"];
var cc_token_expire = parseInt(localStorage["cc_token_expire"] || 0);
var cc_lyrics_cache = JSON.parse(localStorage["cc_lyrics_cache"] || "{}");
var cc_audio_cache = JSON.parse(localStorage["cc_audio_cache"] || "{}");
var cc_track_cache = JSON.parse(localStorage["cc_track_cache"] || "{}");
var cc_trending = null;
var cc_search_cache = [];
var cc_history = JSON.parse(localStorage["cc_history"] || "[]");

async function getTrending() {
  async function get() {
    const f = await fetch("https://api.spotify.com/v1/playlists/37i9dQZEVXbMDoHDwVN2tF?market=PH", {
      headers: {
        authorization: `Bearer ${await getToken()}`
      }
    });
    return await f.json();
  }
  let res = [];
  if(localStorage["cc_trending"]) {
    const cache = JSON.parse(localStorage["cc_trending"]);
    if(Date.now() > cache.expire + 864e5) {
      res = await get();
    } else {
      res = cache.res;
    }
  } else {
    res = await get();
  }
  let map = [];
  for(let i = 0; i < res.tracks.items.length; i++) {
    let track = res.tracks.items[i].track;
    map.push({
      position: i + 1,
      artist: track.artists[0].name,
      image: getHighestImage(track.album.images).url,
      album: track.album.name,
      name: track.name,
      explicit: track.explicit,
      id: track.id
    });
  }
  localStorage["cc_trending"] = JSON.stringify({
    expire: Date.now(),
    res
  });
  return map;
}

async function getToken() {
  // 5 minutes expiration
  if(Date.now() > cc_token_expire + 5e5) {
    const f = await fetch("https://byebyecors.vercel.app/open.spotify.com/get_access_token?reason=transport&productType=web_player");
    const res = await f.json();
    cc_token = res.accessToken;
    cc_token_expire = Date.now();
  }
  localStorage["cc_token"] = cc_token;
  localStorage["cc_token_expire"] = cc_token_expire;
  return cc_token;
}

async function getSearch(keyword, first) {
  const f = await fetch(`https://api.spotify.com/v1/search?q=${encodeURIComponent(keyword)}&market=PH&limit=10&offset=0&type=track`, {
    headers: {
      authorization: `Bearer ${await getToken()}`
    }
  });
  const res = await f.json();
  let map = [];
  for(let i = 0; i < res.tracks.items.length; i++) {
    let track = res.tracks.items[i];
    map.push({
      name: track.name,
      artist: track.artists[0].name,
      image: getHighestImage(track.album.images).url,
      album: track.album.name,
      explicit: track.explicit,
      id: track.id
    });
  }
  return first ? map[0] : map;
}

async function getAudio(name, artist) {
  const keyword = encodeURIComponent(`${name} ${artist}`.replaceAll(/[\[\]\(\)\<\>\{\}\"]/g, ""));
  const f = await fetch(`https://pipedapi.ngn.tf/search?q=${keyword}&filter=music_songs`);
  const res = await f.json();
  let item = res.items.find(i => {
    const title = i.title.trim().toLowerCase().replaceAll(/[^\x00-\x7F]/gmi, "");
    const track = name.trim().toLowerCase().replaceAll(/[^\x00-\x7F]/gmi, "");
    return title.includes(track);
  });
  if(!item) item = res.items[0];
  const id = item.url.substr(9, res.items[0].url.length);
  return `https://creytm.vercel.app/${id}/${name.trim().replaceAll(" ", "-")}.mp3`;
}

function getHighestImage(images) {
  let selected = null;
  let highest = 0;
  let unfiltered = [];
  images.forEach(image => {
    let size = image.width * image.height;
    if(size > highest) {
      highest = size;
      selected = image;
      unfiltered.push(image);
    }
  });
  unfiltered.forEach(image => {
    let size = image.width * image.height;
    if(size > highest) {
      highest = size;
      selected = image;
    }
  });
  return selected;
}

function romanize(num) {
  const lookup = [[1000, 'M'], [900, 'CM'] , [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']];
  if(num == 0) return "";
  for(let i = 0; i < lookup.length; i++) {
    if(num >= lookup[i][0]) {
      return lookup[i][1] + romanize(num - lookup[i][0]);
    }
  }
}

function getTier(score) {
  const grades = [{ min: 95, grade: "S+" }, { min: 90, grade: "A+" }, { min: 80, grade: "A" }, { min: 70, grade: "B" }, { min: 60, grade: "C" }, { min: 50, grade: "D" }, { min: 0, grade: "F" }];
  for(let i = 0; i < grades.length; i++) {
    if(score >= grades[i].min) {
      return grades[i].grade;
    }
  }
}

function openSearch(noshow) {
  const history = cc_history.length >= 10;
  const map = history ? cc_history.reverse() : cc_trending;
  let html = `<p class="fw-bold text-white m-0">${history ? "Songs you've listen to" : "Try these songs"}</p>`;
  cc_search_cache = [];
  map.slice(0, 10).forEach((track, i) => {
    cc_search_cache.push(track);
    html += `<div class="d-flex gap-3 align-items-center my-3 track-item" onclick="openTrackURL(${i})" data-bs-dismiss="offcanvas"><img src="${track.image}" alt="" class="header-list-item rounded-2 pointer-pass"><div class="d-flex flex-column flex-grow-1 w-50 pointer-pass"><p class="m-0 text-white text-ellipsis pointer-pass track-name">${track.name} ${track.explicit ? `<small><i class="bi bi-explicit-fill"></i></small>` : ""}</p><p class="m-0 text-fade-3 text-ellipsis pointer-pass d-flex align-items-center track-artist">${track.artist}</p></div></div>`;
  });
  $("#search-list").html(html);
  if(!noshow) new bootstrap.Offcanvas("#offcanvas-search").show();
  $("#search-input").focus().val("");
}

function openHomePage() {
  $("#page-track").fadeOut(200, _ => {
    $("#page-home").fadeIn(200);
  });
}

function openTrackPage() {
  $("#page-home").fadeOut(200, _ => {
    $("#page-track").fadeIn(200);
  });
}

async function getLyrics(name, artist) {
  const req = await fetch(`https://byebyecors.vercel.app/lyrist.vercel.app/api/${name.replaceAll(/[\[\]\(\)\<\>\{\}\"]/g, "")}/${artist}`);
  const res = await req.json();
  if(res.lyrics == null) return `<span class="text-fade-3">Lyrics are not available</span>`;
  let padded = false;
  return res.lyrics.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").split("\n").filter(line => {
    if(line.trim().length == 0) {
      if(padded) return;
      padded = true;
    } else padded = false;
    return true;
  }).map(line => {
    if(line.startsWith("[") && line.endsWith("]")) return `<span class="text-fade-3">${line}</span>`;
    return line.trim();
  }).join("<br>");
}

function openTrackURL(index) {
  const track = cc_search_cache[index];
  const name = track.name;
  const artist = track.artist;
  const id = (track.explicit ? "1" : "0") + track.id;
  const image = new URL(track.image).pathname.replace("/image/", "");
  history.pushState(null, "", `/${image}/${id}/${encodeURIComponent(name)}/${encodeURIComponent(artist)}`);
  openTrack(name, artist, image, id);
}

async function getTrack(id) {
  const f = await fetch(`https://api.spotify.com/v1/tracks/${id}?market=PH`, {
    headers: {
      authorization: `Bearer ${await getToken()}`
    }
  });
  const t = await f.json();
  const p = await fetch(`https://api.spotify.com/v1/albums/${t.album.id}?market=PH`, {
    headers: {
      authorization: `Bearer ${await getToken()}`
    }
  });
  const a = await p.json();
  const track = {
    track_number: t.track_number,
    disc_number: t.disc_number,
    album_type: t.album.album_type,
    total_tracks: t.album.total_tracks,
    album: t.album.name,
    popularity: t.popularity
  }
  const album = {
    tracks: a.tracks.items.map(t => t.name.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")),
    copyrights: a.copyrights.map(c => "(" + c.type + ")").join(" ") + " " + a.label
  }
  return {
    track, album
  }
}

async function openTrack(name, artist, image, id, nospinner) {
  const entry = cc_history.find(i => i.selector == name + artist);
  if(!entry) cc_history.push({ name, artist, image, id, selector: name + artist });
  localStorage["cc_history"] = JSON.stringify(cc_history);
  try {
    $("#track-body, #track-player, #track-info-tracklist").hide();
    $("#track-spinner").toggle(!nospinner);
    $("#track-player-spinner").css("display", "flex");
    openTrackPage();
    $("#track-info-title-text, #track-info-track, #track-info-album, #track-info-copyright").text("...");
    $("#track-info-album-play").text("(P)");
    $("#track-info-title-popularity").text("-");
    $("#track-title-text, #track-info-title-text").text(name);
    $("#track-title-explicit, #track-info-title-explicit").toggle(id.charAt(0) == "1");
    $("#track-artist, #track-info-artist").text(artist);
    $("#track-image").attr("src", "https://i.scdn.co/image/" + image);
    // audio
    const audio = cc_audio_cache[name + artist] || await getAudio(name, artist);
    $("#track-audio").attr("src", audio);
    cc_audio_cache[name + artist] = audio;
    $("#track-body").show();
    $("#track-spinner").hide();
    // lyrics 
    $("#track-lyrics").html(`<span class="text-fade-3">Searching for lyrics...</span>`);
    const lyrics = cc_lyrics_cache[name + artist] || await getLyrics(name, artist);
    cc_lyrics_cache[name + artist] = lyrics;
    $("#track-lyrics").html(lyrics + `<br><br><p class="text-fade-2 text-center m-0">Provided by Genius</p>`);
    // track info
    const trackinfo = cc_track_cache[name + artist] || await getTrack(id.slice(1));
    const track = trackinfo.track;
    $("#track-info-title-popularity").text(getTier(track.popularity) + " Tier");
    $("#track-info-track").html(`Track #${track.track_number}${track.total_tracks > 1 ? `<span class="text-fade-2">/${track.total_tracks}</span>` : ""} &sdot; Disc ${romanize(track.disc_number)}`);
    $("#track-info-album").text(track.album);
    let album = track.album_type;
    $("#track-info-album-play").text(`(${album == "single" ? "SP" : (album == "album" ? "LP" : "EP")})`);
    album = trackinfo.album;
    $("#track-info-tracklist").html(album.tracks.map((name, i) => {
      if(i + 1 == track.track_number) return `<li class="text-white">${name}</li>`;
      return `<li>${name}</li>`;
    }).join("")).toggle(album.tracks.length > 1);
    $("#track-info-copyright").text(album.copyrights);
    cc_track_cache[name + artist] = trackinfo;
    localStorage["cc_lyrics_cache"] = JSON.stringify(cc_lyrics_cache);
    localStorage["cc_audio_cache"] = JSON.stringify(cc_audio_cache);
    localStorage["cc_track_cache"] = JSON.stringify(cc_track_cache);
  } catch(e) {
    console.error(e);
    if(location.hostname != "localhost") location.href = "https://cloudcre.vercel.app/notfound";
  }
}

$("#search-input").on("change", async _ => {
  if($("#search-input").val().trim().length == 0) return openSearch(true);
  $("#search-list").html(`<div class="d-flex justify-content-center align-items-center w-100 h-100"><div class="spinner-border text-white"></div></div>`);
  const res = await getSearch($("#search-input").val());
  let html = `<p class="fw-bold text-white m-0">Songs we've found</p>`;
  cc_search_cache = [];
  res.forEach((track, i) => {
    cc_search_cache.push(track);
    html += `<div class="d-flex gap-3 align-items-center my-3 track-item" onclick="openTrackURL(${i})" data-bs-dismiss="offcanvas"><img src="${track.image}" alt="" class="header-list-item rounded-2 pointer-pass"><div class="d-flex flex-column flex-grow-1 w-50 pointer-pass"><p class="m-0 text-white text-ellipsis pointer-pass track-name">${track.name} ${track.explicit ? `<small><i class="bi bi-explicit-fill"></i></small>` : ""}</p><p class="m-0 text-fade-3 text-ellipsis pointer-pass d-flex align-items-center track-artist">${track.artist}</p></div></div>`;
  });
  if(res.length == 0) html = `<p class="fw-bold text-white m-0">Looks like we don't have that.</p>`;
  $("#search-list").html(html);
});

$("#track-audio").on("canplay", evt => {
  $("#player-slider").css("width", 0);
  $("#track-player-spinner").hide();
  $("#track-player").css("display", "flex");
  clearInterval(audio_listener);
  allow_download = false;
  $("#track-download").html(`<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" class="bi bi-play-fill" viewBox="0 0 16 16"><path d="m11.596 8.697-6.363 3.692c-.54.313-1.233-.066-1.233-.697V4.308c0-.63.692-1.01 1.233-.696l6.363 3.692a.802.802 0 0 1 0 1.393"/></svg>`).removeAttr("href");
}).on("timeupdate", evt => {
  const width = (evt.target.currentTime / evt.target.duration) * 100;
  $("#player-slider").css("width", width + "%");
});

$("#track-audio").on("ended", evt => {
  allow_download = false;
  $("#track-download").html(`<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" class="bi bi-play-fill" viewBox="0 0 16 16"><path d="m11.596 8.697-6.363 3.692c-.54.313-1.233-.066-1.233-.697V4.308c0-.63.692-1.01 1.233-.696l6.363 3.692a.802.802 0 0 1 0 1.393"/></svg>`).removeAttr("href");
}).on("pause", evt => {
  allow_download = false;
  $("#track-download").html(`<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" class="bi bi-play-fill" viewBox="0 0 16 16"><path d="m11.596 8.697-6.363 3.692c-.54.313-1.233-.066-1.233-.697V4.308c0-.63.692-1.01 1.233-.696l6.363 3.692a.802.802 0 0 1 0 1.393"/></svg>`).removeAttr("href");
});

var audio_listener = null;
var allow_download = false;
$("#track-download").on("click", () => {
  if(allow_download) return;
  if(audio_listener != null) clearInterval(audio_listener);
  audio_listener = setInterval(() => {
    if($("#track-audio")[0].error == null) return;
    $("#track-player-spinner").hide();
    $("#track-player").css("display", "flex");
    $("#track-player").html(`<p class="text-center m-0 text-fade-2">&#x28;&#x2060;&#x2565;&#x2060;&#xfe4f;&#x2060;&#x2565;&#x2060;&#x29;<br>No stream available</p>`);
    clearInterval(audio_listener);
  }, 1e3);
  $("#track-download").html(`<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" class="bi bi-cloud-arrow-down-fill" viewBox="0 0 16 16"><path d="M8 2a5.53 5.53 0 0 0-3.594 1.342c-.766.66-1.321 1.52-1.464 2.383C1.266 6.095 0 7.555 0 9.318 0 11.366 1.708 13 3.781 13h8.906C14.502 13 16 11.57 16 9.773c0-1.636-1.242-2.969-2.834-3.194C12.923 3.999 10.69 2 8 2m2.354 6.854-2 2a.5.5 0 0 1-.708 0l-2-2a.5.5 0 1 1 .708-.708L7.5 9.293V5.5a.5.5 0 0 1 1 0v3.793l1.146-1.147a.5.5 0 0 1 .708.708"/></svg>`);
  $("#track-audio")[0].play();
  allow_download = true;
  setTimeout(() => $("#track-download").attr("href", $("#track-audio")[0].src), 1e3);
});

var menu_open = false;
function toggleMenu() {
  menu_open = !menu_open;
  if(menu_open) {
    $("#navbar-menu-outer").css("display", "flex");
    $("#navbar-menu").animate({ opacity: 1 }, 200);
  } else {
    $("#navbar-menu").animate({ opacity: 0 }, 200, () => $("#navbar-menu-outer").hide());
  }
}

var alert_shown = false;
function showAlert(text) {
  let delay = 0;
  if(alert_shown) {
    hideAlert();
    delay = 2e3;
  }
  alert_shown = true;
  setTimeout(() => {
    $("#main-alert").css("display", "flex");
    $("#alert").animate({ opacity: 1 }, 200);
    $("#alert-text").text(text);
  }, delay);
  setTimeout(hideAlert, 5e3);
}

function hideAlert() {
  alert_shown = false;
  $("#alert").animate({ opacity: 0 }, 200, () => $("#main-alert").hide());
}

function clearHistory() {
  localStorage["cc_history"] = "[]";
  cc_history = [];
  showAlert("History cleared");
  toggleMenu();
}

function purgeCache() {
  localStorage.clear();
  cc_token = null;
  cc_token_expire = 0;
  cc_lyrics_cache = {};
  cc_audio_cache = {};
  cc_track_cache = {};
  localStorage["cc_history"] = JSON.stringify(cc_history);
  showAlert("All cache has been purged");
  toggleMenu();
}

$(document).ready(async _ => {
  cc_trending = await getTrending();
  const seg = location.pathname.slice(1).split("/").map(i => decodeURIComponent(i));
  if(seg.length == 4) {
    await openTrack(seg[2], seg[3], seg[0], seg[1], true);
    $("#track-spinner").hide();
  } else if(seg.length > 1) {
    showAlert("Song not found");
  }
  $("#main-spinner").css("opacity", 0);
  setTimeout(_ => $("#main-spinner")[0].remove(), 200);
  if(location.pathname == "/notfound") {
    showAlert("Song not found");
  }
});