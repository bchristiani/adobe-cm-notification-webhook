module.exports = (req, res) => {
	console.log('Handling challenge probe')
	const challenge = req.query['challenge']
	if (challenge) {
		res.set('Content-Type', 'text/plain')
		res.send(challenge)
	} else {
		console.log('No challenge')
		res.status(400)
		res.end()
	}
}

