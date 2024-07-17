function openSearch(noshow) {
  let html = `<p class="fw-bold text-white m-0">${history ? "Songs you've listen to" : "Try these songs"}</p>`;
  Utils.SEARCH = Utils.TRENDING;
  Utils.TRENDING.forEach((track, i) => {
    html += `<div class="d-flex gap-3 align-items-center my-3 track-item" onclick="openTrack(${i})" data-bs-dismiss="offcanvas"><img src="${track.image}" alt="" class="header-list-item rounded-2 pointer-pass"><div class="d-flex flex-column flex-grow-1 w-50 pointer-pass"><p class="m-0 text-white text-ellipsis pointer-pass track-name">${track.name} ${track.explicit ? `<small><i class="bi bi-explicit-fill"></i></small>` : ""}</p><p class="m-0 text-fade-3 text-ellipsis pointer-pass d-flex align-items-center track-artist">${track.artist}</p></div></div>`;
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

async function openTrack(i) {
  const track = Utils.SEARCH[i];
  $("#track-body, #track-player, #track-info-tracklist").hide();
  $("#track-spinner").show();
  $("#track-player-spinner").css("display", "flex");
  openTrackPage();
  $("#track-title-text").text(track.name);
  $("#track-title-explicit").toggle(track.explicit);
  $("#track-artist").text(track.artist);
  $("#track-image").attr("src", track.image);
  $("#track-lyrics").html(`<span class="text-fade-3">Searching for lyrics...</span>`);
  let stream, lyrics;
  if(track.id in Utils.STREAMS) {
    stream = Utils.STREAMS[track.id];
  } else {
    stream = await Utils.getStream(track.name, track.publisher);
  }
  // audio
  $("#track-audio").attr("src", stream.audio);
  Utils.DISPOSE = stream.dispose;
  $("#track-body").show();
  $("#track-spinner").hide();
  if(track.id in Utils.LYRICS) {
    lyrics = Utils.LYRICS[track.id];
  } else {
    lyrics = await Utils.getLyrics(track.name, track.publisher);
  }
  // lyrics
  $("#track-lyrics").html(lyrics.length == 0 ? `<span class="text-fade-3">Lyrics are not available</span>` : lyrics.map(line => {
    if(line.startsWith("[") && line.endsWith("]")) return `<span class="text-fade-3">${line}</span>`;
    return Utils.sanitize(line.trim());
  }).join("<br>"));
  Utils.cacheResources(track, stream, lyrics);
}

$("#search-input").on("change", async _ => {
  if($("#search-input").val().trim().length == 0) return openSearch(true);
  $("#search-list").html(`<div class="d-flex justify-content-center align-items-center w-100 h-100"><div class="spinner-border text-white"></div></div>`);
  const res = await Utils.search($("#search-input").val());
  let html = `<p class="fw-bold text-white m-0">Songs we've found</p>`;
  Utils.SEARCH = res;
  res.forEach((track, i) => {
    html += `<div class="d-flex gap-3 align-items-center my-3 track-item" onclick="openTrack(${i})" data-bs-dismiss="offcanvas"><img src="${track.image}" alt="" class="header-list-item rounded-2 pointer-pass"><div class="d-flex flex-column flex-grow-1 w-50 pointer-pass"><p class="m-0 text-white text-ellipsis pointer-pass track-name">${track.name} ${track.explicit ? `<small><i class="bi bi-explicit-fill"></i></small>` : ""}</p><p class="m-0 text-fade-3 text-ellipsis pointer-pass d-flex align-items-center track-artist">${track.artist}</p></div></div>`;
  });
  if(res.length == 0) html = `<p class="fw-bold text-white m-0">Looks like we don't have that.</p>`;
  $("#search-list").html(html);
});

$("#track-audio").on("canplay", evt => {
  $("#player-slider").css("width", 0);
  $("#track-player-spinner").hide();
  $("#track-player").css("display", "flex");
  allow_download = false;
  $("#track-download").html(`<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" class="bi bi-play-fill" viewBox="0 0 16 16"><path d="m11.596 8.697-6.363 3.692c-.54.313-1.233-.066-1.233-.697V4.308c0-.63.692-1.01 1.233-.696l6.363 3.692a.802.802 0 0 1 0 1.393"/></svg>`).removeAttr("href");
}).on("timeupdate", evt => {
  const width = (evt.target.currentTime / evt.target.duration) * 100;
  $("#player-slider").css("width", width + "%");
});

$("#track-audio").on("ended", evt => {
  allow_download = false;
  $("#track-download").html(`<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" class="bi bi-play-fill" viewBox="0 0 16 16"><path d="m11.596 8.697-6.363 3.692c-.54.313-1.233-.066-1.233-.697V4.308c0-.63.692-1.01 1.233-.696l6.363 3.692a.802.802 0 0 1 0 1.393"/></svg>`).removeAttr("href");
  clearInterval(audio_listener);
}).on("pause", evt => {
  allow_download = false;
  $("#track-download").html(`<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" class="bi bi-play-fill" viewBox="0 0 16 16"><path d="m11.596 8.697-6.363 3.692c-.54.313-1.233-.066-1.233-.697V4.308c0-.63.692-1.01 1.233-.696l6.363 3.692a.802.802 0 0 1 0 1.393"/></svg>`).removeAttr("href");
  clearInterval(audio_listener);
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
  $("#track-download").html(`<a href="${Utils.DISPOSE}" class="text-white"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" class="bi bi-cloud-arrow-down-fill" viewBox="0 0 16 16"><path d="M8 2a5.53 5.53 0 0 0-3.594 1.342c-.766.66-1.321 1.52-1.464 2.383C1.266 6.095 0 7.555 0 9.318 0 11.366 1.708 13 3.781 13h8.906C14.502 13 16 11.57 16 9.773c0-1.636-1.242-2.969-2.834-3.194C12.923 3.999 10.69 2 8 2m2.354 6.854-2 2a.5.5 0 0 1-.708 0l-2-2a.5.5 0 1 1 .708-.708L7.5 9.293V5.5a.5.5 0 0 1 1 0v3.793l1.146-1.147a.5.5 0 0 1 .708.708"/></svg></a>`);
  $("#track-audio")[0].play();
  allow_download = true;
});

$(document).ready(async () => {
  await Utils.init();
  await Utils.trending();
  $("#main-spinner").css("opacity", 0);
  setTimeout(() => $("#main-spinner")[0].remove(), 200);
  console.log("[Beta Feature v5]\n\nTo change the market, call the following function:\n\nUtils.DATABASE.set(\"market\", \"US\")");
});