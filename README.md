<p align="center">Version 4.0 has arrived! <a href="https://github.com/creuserr/cloudcre?tab=readme-ov-file#four_leaf_clover-whats-new">What's new?</a></p><br>

<p align="center"><a href="https://cloudcre.vercel.app"><img src="https://cloudcre.vercel.app/ico/thumbnail.png" alt="cloudcre" width="500"></a></p>
<p align="center"><a href="https://cloudcre.vercel.app"><img src="https://img.shields.io/badge/status-running-blue?style=for-the-badge&logo=vercel&labelColor=black" alt="status: running"></a></p>

### :cloud: What is cloudcre?
cloudcre is a web application for downloading music. It uses [Piped](https://piped.kavin.rocks), [Spotify Web API](https://developer.spotify.com/documentation/web-api), and [PyTube](https://pytube.io/en/latest/) to function.

### :wrench: Troubleshooting
If the audio is not loading, these are the possible reasons:
1. Poor internet connection &ndash; If this happen, check your internet connection and refresh the website.
2. Too much data &ndash; Since I only use the Hobby plan of Vercel, the limit on the size of the audio is `4.5 MB`. This cannot be resolved unless you deploy your own fork with a paid plan.

### :rocket: Deploy it yourself
Deploying your own is just simple. Fork this repository, add some adjustments, and deploy it (recommended service is Vercel). However, there are some extra steps.

1. Create a new repository &ndash; This will be the API for fetching the audio.
2. Set that repository as a serverless Python function and use the gist template [cloudcre: audio api template](https://gist.github.com/creuserr/02fb1127961632120304c1302f47c583).
3. In `index.js`, modify the `getAudio` function with the gist template [cloudcre: index.js template](https://gist.github.com/creuserr/28f9bdc3da7d5309dbb150d77a6a96e6).

If you want to add some features, you can use some of my APIs like [CreQQ](https://github.com/creuserr/creqq) for synchronized lyrics.

### :four_leaf_clover: What's new?
1. Added history
2. Added lyrics provided by Genius
3. Implemented custom player
4. Added footer information
5. Added permalink support
6. Implemented full caching coverage
7. Fixed minor issues regarding audio streams

#### Tiering system

Tiering system uses the `popularity` score given by Spotify.

> The popularity is calculated by algorithm and is based, in the most part, on the total number of plays the track has had and how recent those plays are.
> 
> The value will be between 0 and 100, with 100 being the most popular.
>
> *[&mdash; Spotify Web API](https://developer.spotify.com/documentation/web-api/reference/get-track)*

The lookup table below is how it selects the tier by the given score.

| Tier | Condition |
|:----:|:---------:|
| S+   | >= 95     |
| A+   | >= 90     |
| A    | >= 80     |
| B    | >= 70     |
| C    | >= 60     |
| D    | >= 50     |
| F    | >= 0      |

#### History

Your latest top 10 history will appear on the search tab. It will only appear if your history list has more than 9 items.

`Try these songs` will never appear again unless you cleared your history.

### :balance_scale: Disclaimer
cloudcre does not host any files and solely uses third-party services. If any copyright is infringed, cloudcre is not liable.
