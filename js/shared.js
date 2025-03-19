let browser;
const onChrome = typeof chrome !== "undefined";
if (typeof browser === "undefined" && onChrome) {
	browser = chrome;
} else {
	browser = browser;
}

let onAccessTokenReceived = (token, expireDate) => { };

function fetchAccessToken(credentials, callback, onError) {
	onAccessTokenReceived = callback;
	$.ajax({
		"url": "https://ges-calendar.unbonwhisky.fr/api/token/get",
		"method": "GET",
		"cache": false,
		"headers": {
			"Authorization": `Basic ${credentials}`
		},
        "success": (response) => {
            if (response && response.token && response.expires_in) {
                const token = response.token;
                const expiresIn = parseInt(response.expires_in, 10);

                const expireDate = new Date();
                expireDate.setSeconds(expireDate.getSeconds() + expiresIn);

                onAccessTokenReceived(token, expireDate);
            }
        },
		"error": (xhr, textStatus, errorThrown) => {
			if (typeof onError === "function") {
				onError(xhr);
			}
		}
	});
}