const VERSION = 3;

addEventListener('fetch', event => {
	event.respondWith(handleRequest(event.request))
})

/**
 * Respond with hello worker text
 * @param {Request} request
 */
async function handleRequest(request) {
	const requestUrl = new URL(request.url);

	if (!requestUrl.pathname.startsWith('/exists')) {
		return new Response('404', {
			status: 404,
			headers: {
				'content-type': 'text/plain',
			}
		})
	}

	let tweetUrl = requestUrl.searchParams.get('url') || null
	
	if (!tweetUrl) {
		return new Response('You must pass in a url parameter with the URL of the tweet', {
			status: 404,
			headers: {
				'content-type': 'text/plain',
			}
		})
	}

	tweetUrl = tweetUrl.split('?').shift()

	const exists = await tweetExists(tweetUrl)

	const headers = {
		'Access-Control-Allow-Origin': '*',
	}
	
	if (exists) {
		return new Response("true", {
			status: 200,
			headers,
		})
	} else {
		return new Response("false", {
			status: 404,
			headers,
		})
	}
}

async function tweetExists(tweetUrl) {
	const parsed = new URL(tweetUrl)
	if (!['twitter.com', 'www.twitter.com', 'mobile.twitter.com'].includes(parsed.host)) {
		return false
	}

	const tweetId = tweetUrl.split('/').pop()
	let exists = await TWEET_EXISTS.get(VERSION + ':' + tweetId)

	if (exists !== null) {
		exists = !!parseInt(exists, 10)
	} else {
		const response = await fetch(`https://publish.twitter.com/oembed?url=${tweetUrl}`)
		exists = response.ok
		await TWEET_EXISTS.put(VERSION + ':' + tweetId, exists ? "1" : "0", { expirationTtl: 60 * 60 * 6 })
	}

	return exists
}
