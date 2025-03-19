function backgroundFunction(f, args) {
	browser.runtime.sendMessage({
		"type": f,
		"args": args
	});
}

$(document).ready(() => {
	const windowWidth = $("html").outerWidth();
	$("#title-version").html(`(v${browser.runtime.getManifest().version})`);
	$("#main, #myges-login").outerWidth(windowWidth);
	$("#myges-login").css({ "left": windowWidth }).show();

	$("#cb-receive-notification-grades").parent().checkbox();
	$("#cb-receive-notification-grades").on("change", async (event) => {
		const cb = event.target;
		if (cb.checked) {
			const credentials = await hasCredentials();
			const onEnabled = () => {
				setGradesNotificationsEnabled(true);
				showCheckboxNotificationSuccess($("#cb-receive-notification-grades"), "Notifications activées");
				backgroundFunction("initGrades");
			};

			if (!credentials) {
				showLoginForm(null, async () => {
					// On login success
					await closeLoginForm();
					onEnabled();
				}, async (xhr) => {
					// On login failure
					await cancelLogin();
					if (xhr.status == 401) {
						showCheckboxNotificationError($("#cb-receive-notification-grades"), "Identifiants incorrects");
					} else {
						showCheckboxNotificationError($("#cb-receive-notification-grades"), "Une erreur est survenue");
					}
				});
			} else {
				onEnabled();
			}
		} else {
			setGradesNotificationsEnabled(false);
			await clearGrades();
			const enabled = await areAbsencesNotificationsEnabled();
			if (!enabled) {
				clearToken();
				clearCredentials();
			}
			showCheckboxNotificationSuccess($("#cb-receive-notification-grades"), "Notifications désactivées");
		}
	});
	areGradesNotificationsEnabled().then((enabled) => {
		if (enabled) {
			$("#cb-receive-notification-grades").prop("checked", true);
		}
	});

	$("#cb-receive-notification-absences").parent().checkbox();
	$("#cb-receive-notification-absences").on("change", async (event) => {
		const cb = event.target;
		if (cb.checked) {
			const credentials = await hasCredentials();
			const onEnabled = () => {
				setAbsencesNotificationsEnabled(true);
				showCheckboxNotificationSuccess($("#cb-receive-notification-absences"), "Notifications activées");
				backgroundFunction("initAbsences");
			};

			if (!credentials) {
				showLoginForm(null, async () => {
					// On login success
					await closeLoginForm();
					onEnabled();
				}, async (xhr) => {
					// On login failure
					await cancelLogin();
					if (xhr.status == 401) {
						showCheckboxNotificationError($("#cb-receive-notification-absences"), "Identifiants incorrects");
					} else {
						showCheckboxNotificationError($("#cb-receive-notification-absences"), "Une erreur est survenue");
					}
				});
			} else {
				onEnabled();
			}
		} else {
			setAbsencesNotificationsEnabled(false);
			await clearAbsences();
			const enabled = await areGradesNotificationsEnabled();
			if (!enabled) {
				clearToken();
				clearCredentials();
			}
			showCheckboxNotificationSuccess($("#cb-receive-notification-absences"), "Notifications désactivées");
		}
	});
	areAbsencesNotificationsEnabled().then((enabled) => {
		if (enabled) {
			$("#cb-receive-notification-absences").prop("checked", true);
		}
	});

	$("#cb-take-no-coeff-subjects").parent().checkbox();
	$("#cb-take-no-coeff-subjects").on("change", (event) => {
		const cb = event.target;
		setValue({ "take_no_coeff_subjects": cb.checked });
	});
	getValue("take_no_coeff_subjects").then((obj) => {
		if (obj.take_no_coeff_subjects === true) {
			$("#cb-take-no-coeff-subjects").prop("checked", true);
		}
	});

	$("#cb-replace-logo-myges").parent().checkbox();
	$("#cb-replace-logo-myges").on("change", (event) => {
		const cb = event.target;
		setValue({ "change_myges_logo": cb.checked });
	});
	getValue("change_myges_logo").then((obj) => {
		if (obj.change_myges_logo === true) {
			$("#cb-replace-logo-myges").prop("checked", true);
		}
	});

	$("#myges-login").on("submit", async (e) => {
		e.preventDefault();
		showLoader();

		const login = $("#myges-account-name").val();
		const password = $("#myges-password").val();
		const credentials = encodeCredentials(login, password);
		await saveCredentials(credentials);
		fetchAccessToken(credentials, (token, expireDate) => {
			saveToken(token, expireDate);
			hideLoader();
			const onSuccess = $("#myges-login").data("onsuccess");
			if (typeof onSuccess === "function") {
				onSuccess();
			}
		}, (xhr) => {
			if (xhr.status === 0) {
				return;
			}

			clearToken();
			clearCredentials();

			const onFailure = $("#myges-login").data("onfailure");
			if (typeof onFailure === "function") {
				onFailure(xhr);
			}
		});
		return false;
	});

	$("#myges-login-back").on("click", () => {
		cancelLogin();
	});

	function showLoginForm(onOpened, onLoginSuccess, onLoginFailure) {
		$("#main").animate({ "left": `-${windowWidth}` }, 250);
		$("#myges-login").animate({ "left": 0 }, 250, () => {
			$("#myges-account-name").focus().select();
			if (typeof onOpened === "function") {
				onOpened();
			}
		}).data("onsuccess", onLoginSuccess).data("onfailure", onLoginFailure);
	}

	function closeLoginForm() {
		return new Promise((res, rej) => {
			hideLoader();
			$("#main").animate({ "left": 0 }, 250);
			$("#myges-login").animate({ "left": windowWidth }, 250, res);
		});
	}

	async function cancelLogin() {
		await closeLoginForm();
		$("#cb-receive-notification-grades").prop("checked", false);
		$("#cb-receive-notification-absences").prop("checked", false);
	}

	function showLoader() {
		$("#loader-overlay").fadeIn(250);
		$("#loader").show();
	}

	function hideLoader() {
		$("#loader-overlay").fadeOut(250);
		$("#loader").css({ "display": "none" });
	}

	function showCheckboxNotificationSuccess($cb, msg) {
		const successClearTimeout = $cb.data("successClearTimeout");

		if (successClearTimeout != null) {
			clearTimeout(successClearTimeout);
		}

		msg = `<img src="../img/icons/tick.svg"><span class="msg">${msg}</span>`;
		const $results = $cb.parent().next(".results");
		$results.find(".error").fadeOut(250, () => {
			$results.find(".success").html(msg).fadeIn(250);
			$cb.data("successClearTimeout", setTimeout(() => {
				$results.find(".success").fadeOut(250);
				$cb.data("successClearTimeout", null);
			}, 5000));
		});
	}

	function showCheckboxNotificationError($cb, msg) {
		const errorClearTimeout = $cb.data("errorClearTimeout");

		if (errorClearTimeout != null) {
			clearTimeout(errorClearTimeout);
		}

		msg = `<img src="../img/icons/times.svg"><span class="msg">${msg}</span>`;
		const $results = $cb.parent().next(".results");
		$results.find(".success").fadeOut(250, () => {
			$results.find(".error").html(msg).fadeIn(250);
			$cb.data("errorClearTimeout", setTimeout(() => {
				$results.find(".error").fadeOut(250);
				$cb.data("errorClearTimeout", null);
			}, 5000));
		});
	}

	function encodeCredentials(login, password) {
		return btoa(`${login}:${password}`);
	}
});
