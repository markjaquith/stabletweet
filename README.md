# Stabletweet

A Cloudflare Worker proxy for checking whether a tweet exists.

As of April 2022, Twitter embeds (which are blockquote elements with a special
HTML class) for Tweets that have been deleted or made private will not fall
back to just showing the blockquote, but will render an empty tweet, preventing
people from seeing the content of the tweet that had previously been published
on your site. This destroys editorial context.

This service can be used in conjunction with some JavaScript that only
lets Twitter render tweets that are still available.

See http://www.kevinmarks.com/twittereditsyou.html for more info about Twitter's
change and its implications.

## Installation

1. Clone it.
2. Install Wrangler.
3. `wrangler kv:namespace create "TWEET_EXISTS"`
4. `wrangler kv:namespace create "TWEET_EXISTS" --preview`
5. Combine the data those give you into `wrangler.toml`
6. `wrangler publish`

You can then access `{yourWorkerDomain}/exists?url={tweetUrl}` which will return
a `200` response (and `true`) for Tweets that exist, and `404` (and `false`) for
Tweets that don't exist.

## Script

Here is an example script to use this Worker to decide whether to let Twitter
render tweets:

```javascript
document.addEventListener('DOMContentLoaded', () => {
	// EDIT THIS ENDPOINT — no trailing slash
	const WORKER_ENDPOINT = 'https://stabletweet.YOURNAME.workers.dev'

	function loadWidget() {
		script = document.createElement('script')
		script.type = 'text/javascript'
		script.async = false
		script.src = 'https://platform.twitter.com/widgets.js'
		document.getElementsByTagName('head')[0].appendChild(script)
	}

	document.querySelectorAll('.twitter-tweet').forEach(el => {
		// Pevent Twitter from acting on this blockquote until we know if the Tweet exists.
		el.classList.remove('twitter-tweet')

		// Find the URL of the tweet.
		const href = el.querySelector(':scope > a').href

		// If the tweet exists, add the class back and re-fire the Twitter widgets JS.
		fetch(WORKER_ENDPOINT + '/exists?url=' + href).then(res => {
			if (res.ok) {
				el.classList.add('twitter-tweet')
				loadWidget()
			}
		})
	})
})
```