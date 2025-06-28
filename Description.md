# URL Shortener Microservice
This is a URL Shortener Microservice built with Node.js and Express.js. It allows users to shorten long URLs with optional custom shortcodes and expiry times. The service tracks clicks, referrers, and geographical location currently coded as "India" for each shortened URL.

## Features
- Create short URLs with optional custom shortcode and expiry time (default 30 minutes)
- Validate URLs and shortcode format to prevent errors and collisions
- Store URL data and click logs in an in-memory Map we can also use mongoDb as well but I used local datastructure
- Track clicks with timestamp, referrer, and geo-location (India)
- Redirect users to original URLs if shortcode is valid and not expired
- Provide statistics API for each shortcode with total clicks and click details
- Middleware to log all requests to remote server
