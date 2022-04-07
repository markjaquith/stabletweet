import { decode } from 'html-entities'

const VERSION = 2;

function html(content) {
	return `
		<!DOCTYPE html>
		<html>
			<head>
				<meta charset="UTF-8">
			</head>
			<body>
				${content}
			</body>
		</html>
	`
}

addEventListener('fetch', event => {
	event.respondWith(handleRequest(event.request))
})

/**
 * Respond with hello worker text
 * @param {Request} request
 */
async function handleRequest(request) {
	const requestUrl = new URL(request.url);
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

	if (requestUrl.pathname.startsWith('/exists')) {
		const tweetId = tweetUrl.split('/').pop()
		let exists = await TWEET_EXISTS.get(VERSION + ':' + tweetId)
		if (exists !== null) {
			exists = !!parseInt(exists, 10)
		} else {
			exists = await tweetExists(tweetUrl)
			await TWEET_EXISTS.put(VERSION + ':' + tweetId, exists ? "1" : "0")
		}

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

	const {
		handle,
		givenName,
		date,
		tweetText,
	} = await getTweet(tweetUrl)

	return new Response(html(`<blockquote><p>${tweetText}</p>&mdash; ${givenName} (@${handle}) <a href="${tweetUrl}">${date}</a></blockquote>`), {
		status: 200,
		headers: {
			'Content-Type': 'text/html'
		},
	})
}

async function getTweet(tweetUrl) {
	console.log(`Fetching ${tweetUrl}`)
	const tweetId = tweetUrl.split('/').pop()
	console.log({ tweetId })
	let data = await TWEETS.get(VERSION + ':' + tweetId)

	if (data) {
		data = JSON.parse(data)
	} else {	
		const tweet = await fetch(tweetUrl, {
			headers: {
				'user-agent': 'googlebot',
			}
		})
		console.log('Got Tweet')

		let htmlPage = await tweet.text()
		let tweetText = decode(htmlPage.match(/<meta data-rh="true" content="([^"]+)" property="og:description"/)[1] || '')
		tweetText = tweetText.substring(1, tweetText.length - 1)
		console.log('Parsed tweet', tweetText)

		let givenName = htmlPage.match(/content="([^"]+)"\s+itemProp="givenName"/)[1] || ''
		let handle = htmlPage.match(/content="([^"]+)"\s+itemProp="additionalName"/)[1] || ''
		let date = htmlPage.match(/content="([^"]+)" itemProp="datePublished"/)[1] || ''
		date = new Date(date)
		date = date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
		data = {
			handle,
			givenName,
			date,
			tweetText,
		}
		await TWEETS.put(VERSION + ':' + tweetId, JSON.stringify(data))
	}

	return data
}

async function tweetExists(tweetUrl) {
	const response = await fetch(`https://publish.twitter.com/oembed?url=${tweetUrl}`)
	console.log(response)
	return response.ok
}
