var cc_token = null;
var cc_token_expire = 0;
var cc_trending = null;

async function getTrending() {
  const f = await fetch("https://api.spotify.com/v1/playlists/37i9dQZEVXbMDoHDwVN2tF?market=PH", {
    headers: {
      authorization: `Bearer ${await getToken()}`
    }
  });
  const res = await f.json();
  let map = [];
  for(let i = 0; i < res.tracks.items.length; i++) {
    let track = res.tracks.items[i].track;
    map.push({
      position: i + 1,
      artist: track.artists[0].name,
      image: getHighestImage(track.album.images).url,
      album: track.album.name,
      name: track.name,
      explicit: track.explicit
    });
  }
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
  return cc_token;
}

async function getSearch(keyword) {
  const f = await fetch(`https://api.spotify.com/v1/search?q=${keyword}&market=PH&limit=10&offset=0&type=track`, {
    headers: {
      authorization: `Bearer ${await getToken()}`
    }
  });
  const res = await f.json();
  let map = [];
  for(let i = 0; i < res.tracks.items.length; i++) {
    let track = res.tracks.items[i];
    map.push({
      preview: track.preview_url,
      name: track.name,
      artist: track.artists[0].name,
      image: getHighestImage(track.album.images).url,
      album: track.album.name,
      explicit: track.explicit
    })
  }
  return map;
}

async function getAudio(name, artist) {
  const f = await fetch(`https://pipedapi.ngn.tf/search?q=${encodeURIComponent(`${name} ${artist}`)}&filter=music_songs`);
  const res = await f.json();
  const id = res.items[0].url.substr(9, res.items[0].url.length);
  function pair(a, b) {
    return 0.5 * (a + b) * (a + b + 1) + b;
  }
  let joint = new Array(Math.ceil(id.length / 2)).fill(0).map((_, i) => {
    let a = id.charCodeAt(i * 2);
    let b = id.charCodeAt((i * 2) + 1) || 0;
    return [pair(a, b), i];
  });
  let randomized = joint.sort(_ => Math.random() - 0.5);
  let current = 0;
  let keys = "";
  while(current != randomized.length) {
    randomized.forEach((k, i) => {
      if(k[1] != current) return;
      keys += i;
    });
    current++;
  }
  return `https://creytm.vercel.app/${keys}.${randomized.map(i => i[0]).join(".")}/${name.trim().replaceAll(" ", "-")}.mp3`;
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

let cc_search_cache = {};
function openSearch() {
  let html = `<p class="fw-bold text-white m-0">Try these songs</p>`;
  let size = 0;
  cc_search_cache = [];
  cc_trending.forEach((track, i) => {
    if(size > 10) return;
    cc_search_cache.push(track);
    html += `<div class="d-flex gap-3 align-items-center my-3 track-item" onclick="openTrack(event, ${i})" data-bs-dismiss="offcanvas"><img src="${track.image}" alt="" class="header-list-item rounded-2 pointer-pass"><div class="d-flex flex-column flex-grow-1 w-50 pointer-pass"><p class="m-0 text-white text-ellipsis pointer-pass track-name">${track.name} ${track.explicit ? `<small><i class="bi bi-explicit-fill"></i></small>` : ""}</p><p class="m-0 text-fade-3 text-ellipsis pointer-pass d-flex align-items-center track-artist">${track.artist}</p></div></div>`;
    size++;
  });
  $("#search-list").html(html);
  new bootstrap.Offcanvas("#offcanvas-search").show();
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

var cc_song_cache = {};
var cc_lyrics_cache = {};
var cc_audio_cache = {};
var cc_lyrics = [];
async function openTrack(evt, i) {
  const name = $(evt.target.querySelector(".track-name")).text();
  const artist = [...evt.target.querySelector(".track-artist").childNodes][0].wholeText.trim();
  $("#track-body").hide();
  $("#track-spinner").show();
  openTrackPage();
  // track info
  let track = null;
  if(cc_song_cache[name + artist]) track = cc_song_cache[name + artist];
  else if(i != null) track = cc_search_cache[i];
  else track = (await getSearch(`${name} ${artist}`))[0];
  cc_song_cache[name + artist] = track;
  $("#track-title").text(track.name);
  $("#track-artist").text(track.artist);
  $("#track-image").attr("src", track.image);
  // audio
  const audio = cc_audio_cache[name + artist] || await getAudio(name, artist);
  $("#track-audio").attr("src", audio);
  cc_audio_cache[name + artist] = audio;
  $("#track-body").show();
  $("#track-spinner").hide();
}

$("#search-input").on("change", async _ => {
  $("#search-list").html(`<div class="d-flex justify-content-center align-items-center w-100 h-100"><div class="spinner-border text-white"></div></div>`);
  const res = await getSearch($("#search-input").val());
  let html = `<p class="fw-bold text-white m-0">Songs we've found</p>`;
  cc_search_cache = [];
  res.forEach((track, i) => {
    cc_search_cache.push(track);
    html += `<div class="d-flex gap-3 align-items-center my-3 track-item" onclick="openTrack(event, ${i})" data-bs-dismiss="offcanvas"><img src="${track.image}" alt="" class="header-list-item rounded-2 pointer-pass"><div class="d-flex flex-column flex-grow-1 w-50 pointer-pass"><p class="m-0 text-white text-ellipsis pointer-pass track-name">${track.name} ${track.explicit ? `<small><i class="bi bi-explicit-fill"></i></small>` : ""}</p><p class="m-0 text-fade-3 text-ellipsis pointer-pass d-flex align-items-center track-artist">${track.artist}</p></div></div>`;
  });
  if(res.length == 0) html = `<p class="fw-bold text-white m-0">Looks like we don't have that.</p>`;
  $("#search-list").html(html);
});

$(document).ready(async _ => {
  cc_trending = await getTrending();
  $("#main-spinner").css("opacity", 0);
  setTimeout(_ => $("#main-spinner")[0].remove(), 200);
});