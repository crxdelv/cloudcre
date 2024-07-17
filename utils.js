class Indexed {
  static version = 1;
  static supported = "indexedDB" in window;
  static Database = class {
    constructor(db) {
      this.db = db;
    }
    set(key, value) {
      if(!Indexed.supported) return localStorage.setItem(key, value);
      const db = this.db;
      return new Promise((resolve, reject) => {
        const trans = db.transaction(["main"], "readwrite");
        const store = trans.objectStore("main");
        const request = store.get(key);
        request.onsuccess = () => {
          const result = request.result;
          if(result != null) {
            result.value = value;
            store.put(result);
          } else {
            store.put({ key, value });
          }
          resolve();
        }
        request.onerror = () => {
          reject(request.error);
        }
      });
    }
    get(key, value) {
      if(!Indexed.supported) return localStorage.getItem(key) || value;
      const db = this.db;
      return new Promise((resolve, reject) => {
        const trans = db.transaction(["main"], "readonly");
        const store = trans.objectStore("main");
        const request = store.get(key);
        request.onsuccess = () => {
          const result = request.result;
          resolve(result?.value || value);
        }
        request.onerror = () => {
          reject(request.error);
        }
      });
    }
  }
  static open(name, version=1) {
    if(!Indexed.supported) return new Indexed.Database(null);
    return new Promise((resolve, reject) => {
      const request = window.indexedDB.open(name, version);
      request.onupgradeneeded = evt => {
        const db = evt.target.result;
        const main = db.createObjectStore("main", { keyPath: "key" });
        main.createIndex("value", "value", { unique: false });
      }
      request.onsuccess = evt => {
        resolve(new Indexed.Database(evt.target.result));
      }
      request.onerror = evt => {
        reject(evt.target.error);
      }
    });
  }
}

const Utils = {};

Utils.init = async () => {
  Utils.DATABASE = await Indexed.open("cloudcre");
  Utils.TOKEN = await Utils.DATABASE.get("token");
  Utils.TOKEN_EXP = await Utils.DATABASE.get("token-exp", 0);
  Utils.TRENDING = await Utils.DATABASE.get("trending");
  Utils.TRENDING_EXP = await Utils.DATABASE.get("trending-exp", 0);
  Utils.MARKET = await Utils.DATABASE.get("market", "US");
  Utils.TRACKS = await Utils.DATABASE.get("tracks", {});
  Utils.STREAMS = await Utils.DATABASE.get("streams", {});
  Utils.LYRICS = await Utils.DATABASE.get("lyrics", {});
}

Utils.getToken = async () => {
  if(Date.now() > Utils.TOKEN_EXP) {
    const f = await fetch("https://creprox.vercel.app/open.spotify.com/get_access_token?reason=transport&productType=web_player");
    const res = await f.json();
    Utils.TOKEN = res.accessToken;
    Utils.TOKEN_EXP = res.accessTokenExpirationTimestampMs;
    Utils.DATABASE.set("token", Utils.TOKEN);
    Utils.DATABASE.set("token-exp", Utils.TOKEN_EXP);
  }
  return Utils.TOKEN;
}

Utils.trending = async () => {
  if(Date.now() < Utils.TRENDING_EXP) return Utils.TRENDING;
  const f = await fetch(`https://api.spotify.com/v1/playlists/37i9dQZEVXbMDoHDwVN2tF?market=${Utils.MARKET}`, {
    headers: {
      authorization: `Bearer ${await Utils.getToken()}`
    }
  });
  const res = await f.json();
  Utils.TRENDING = res.tracks.items.slice(0, 10).map(({ track }, i) => { return {
    position: i + 1,
    artist: Utils.fmtArtists(track.artists),
    publisher: track.artists[0].name,
    image: track.album.images.reduce((max, obj) => obj.width > max.width? obj : max, { width: 0 }).url,
    album: track.album.name,
    explicit: track.explicit,
    name: track.name,
    id: track.id
  }});
  Utils.TRENDING_EXP = Date.now() + 864e5;
  Utils.DATABASE.set("trending", Utils.TRENDING);
  Utils.DATABASE.set("trending-exp", Utils.TRENDING_EXP);
  return Utils.TRENDING;
}

Utils.fmtArtists = list => {
  if(list.length == 1) return list[0].name;
  const last = list.pop().name;
  return list.map(i => i.name).join(", ") + ` & ${last}`;
}

Utils.search = async keyword => {
  const f = await fetch(`https://api.spotify.com/v1/search?q=${encodeURIComponent(keyword)}&market=${Utils.MARKET}&limit=10&offset=0&type=track`, {
    headers: {
      authorization: `Bearer ${await Utils.getToken()}`
    }
  });
  const res = await f.json();
  return res.tracks.items.map(track => { return {
    artist: Utils.fmtArtists(track.artists),
    publisher: track.artists[0].name,
    image: track.album.images.reduce((max, obj) => obj.width > max.width? obj : max, { width: 0 }).url,
    album: track.album.name,
    explicit: track.explicit,
    name: track.name,
    id: track.id
  }});
}

Utils.getStream = async (name, artist) => {
  const keyword = encodeURIComponent(`${name.toLowerCase()} ${artist.toLowerCase()}`.replaceAll(/[\(\)]/g, ""));
  const f = await fetch(`https://pipedapi.ngn.tf/search?q=${keyword}&filter=music_songs`);
  const res = await f.json();
  let item = res.items.find(i => {
    const title = i.title.trim().toLowerCase().replaceAll(/[^\x00-\x7F]/gmi, "");
    const track = name.trim().toLowerCase().replaceAll(/[^\x00-\x7F]/gmi, "");
    return title == track;
  });
  if(!item) item = res.items[0];
  const id = item.url.substr(9, res.items[0].url.length);
  return {
    audio: `https://cloudcre-audio.vercel.app/${id}`,
    dispose: `https://cloudcre-audio.vercel.app/dispose/${id}/${name.trim().replaceAll(" ", "-")}.mp3`
  }
}

Utils.getLyrics = async (name, artist) => {
  const req = await fetch(`https://lyrist.vercel.app/api/${encodeURIComponent(name.toLowerCase().replaceAll(/[\(\)]/g, ""))}/${encodeURIComponent(artist.toLowerCase())}`);
  const res = await req.json();
  if(res.lyrics == null) return [];
  let padded = false;
  return res.lyrics.split("\n").filter(line => {
    if(line.trim().length == 0) {
      if(padded) return;
      padded = true;
    } else padded = false;
    return true;
  });
}

Utils.sanitize = raw => {
  const map = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;",
  };
  return raw.replace(/[&<>"']/g, m => map[m]);
}

Utils.cacheResources = async (track, stream, lyrics) => {
  Utils.TRACKS[track.id] = track;
  Utils.STREAMS[track.id] = stream;
  Utils.LYRICS[track.id] = lyrics;
  Utils.DATABASE.set("tracks", Utils.TRACKS);
  Utils.DATABASE.set("streams", Utils.STREAMS);
  Utils.DATABASE.set("lyrics", Utils.LYRICS);
}