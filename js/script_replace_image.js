async function changeLogo() {
	const obj = await getValue("change_myges_logo");
	if (obj.change_myges_logo === true) {
		const checkLogo = setInterval(() => {
		const logo = $("#mg_portal_title_logo"); // URL of #mg_portal_title_logo : 'https://myges.fr/public/images/icons/logo_myges_126x40.png'
		if (logo.length > 0) {
			logo.attr("src", chrome.runtime.getURL("img/logo_merguez_126x40.png"));
			clearInterval(checkLogo);
		}
		}, 10);
	}
}
changeLogo();