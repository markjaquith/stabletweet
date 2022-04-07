import { decode } from 'html-entities'

function html(content) {
	return `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
</head>
<body>${content}
</body>
</html>`
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
	const tweetUrl = requestUrl.searchParams.get('url') || null

	if (!tweetUrl) {
		return new Response('You must pass in a url parameter with the URL of the tweet', {
			status: 404,
			headers: {
				'content-type': 'text/plain',
			}
		})
	}

	console.log(`Fetching ${tweetUrl}`)
	/*
	<meta content="2022-03-29T10:36:27.000Z" itemProp="datePublished"/>
	<meta content="https://twitter.com/kevinmarks/status/1508754955108241414" itemProp="url"/>
	<meta content="https://twitter.com/kevinmarks/status/1508754955108241414" itemProp="mainEntityOfPage"/>
	<div itemProp="author" itemscope="" itemType="https://schema.org/Person">
	<meta content="57203" itemProp="identifier"/>
	<meta content="kevinmarks" itemProp="additionalName"/>
	<meta content="Kevin Marks" itemProp="givenName"/>
	*/
	// <meta data-rh="true" content="“hi @TwitterEng - you broke the fallback case in the tweet embedding js for deleted tweets. Previously they would not be decorated and show the &amp;lt;blockquote&amp;gt; html version. Now they&#x27;re turned into empty white boxes. Do you want us to go back to screenshots?”" property="og:description"/>
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
	


	console.log('Parsed name', givenName, handle)
// &mdash; Kevin Marks (@kevinmarks) \u003Ca href=\"https:\/\/twitter.com\/kevinmarks\/status\/1508754955108241414?ref_src=twsrc%5Etfw\"\u003EMarch 29, 2022\u003C\/a\u003E\u003C
	return new Response(html(`<blockquote><p>${tweetText}</p>&mdash; ${givenName} (@${handle}) <a href="${tweetUrl}">${date}</a></blockquote>`), {
		status: 200,
		headers: {
			'Content-Type': 'text/html'
		},
	})
}
