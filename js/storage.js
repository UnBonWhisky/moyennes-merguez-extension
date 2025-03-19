async function saveToken(token, expireDate) {
	await setValue({
		"access_token": token,
		"access_token_expire_date": expireDate.toJSON(),
	});
}

async function loadToken() {
	const obj = await getValue("access_token");
	return obj.access_token;
}

async function loadTokenExpirationDate() {
	const obj = await getValue("access_token_expire_date");
	if (obj.access_token_expire_date != null) {
		obj.access_token_expire_date = new Date(obj.access_token_expire_date);
	}
	return obj.access_token_expire_date;
}

async function hasToken() {
	const token = await loadToken();
	return token != null;
}

async function clearToken() {
	await removeValue([
		"access_token",
		"access_token_expire_date",
	]);
}

async function setGradesNotificationsEnabled(state) {
	await setValue({
		"grades_notifications": state === true,
	});
}

async function areGradesNotificationsEnabled() {
	const obj = await getValue("grades_notifications");
	return obj.grades_notifications === true;
}

async function setAbsencesNotificationsEnabled(state) {
	await setValue({
		"absences_notifications": state === true,
	});
}

async function areAbsencesNotificationsEnabled() {
	const obj = await getValue("absences_notifications");
	return obj.absences_notifications === true;
}

async function saveGrades(grades) {
	let obj = await loadGrades();
	if (obj === undefined || obj === null) {
		obj = {};
	}

	for (const grade of grades) {
		if (!(grade.year in obj)) {
			obj[grade.year] = {};
		}
		if (!(grade.trimester in obj[grade.year])) {
			obj[grade.year][grade.trimester] = {};
		}
		obj[grade.year][grade.trimester][grade.course] = {
			"exam": grade.exam,
			"grades": grade.grades
		};
	}

	await setValue({
		"grades": obj,
	});
}

async function loadGrades() {
	const obj = await getValue("grades");
	return obj.grades || {};
}

async function clearGrades() {
	await removeValue("grades");
}

async function saveAbsences(absences) {
	const obj = await loadAbsences();
	if (obj === undefined || obj === null) {
		obj = {};
	}

	for (const abs of absences) {
		if (!(abs.year in obj)) {
			obj[abs.year] = {};
		}
		if (!(abs.trimester in obj[abs.year])) {
			obj[abs.year][abs.trimester] = {};
		}
		if (!(abs.course_name in obj[abs.year][abs.trimester])) {
			obj[abs.year][abs.trimester][abs.course_name] = {};
		}
		obj[abs.year][abs.trimester][abs.course_name][abs.date] = {
			"justified": abs.justified,
		};
	}

	await setValue({
		"absences": obj,
	});
}

async function loadAbsences() {
	const obj = await getValue("absences");
	return obj.absences || {};
}

async function clearAbsences() {
	await removeValue("absences");
}

async function saveCredentials(credentials) {
	await setValue({
		"credentials": credentials,
	});
}

async function loadCredentials() {
	const obj = await getValue("credentials");
	return obj.credentials;
}

async function hasCredentials() {
	const credentials = await loadCredentials();
	return credentials != null;
}

async function clearCredentials() {
	await removeValue("credentials");
}

function getStorage() {
	return browser.storage.local;
}

function getValue(keys) {
	return new Promise(async (res, rej) => {
		const storage = await getStorage();
		if (onChrome) {
			storage.get(keys, res);
		} else {
			storage.get(keys).then(res);
		}
	});
}

function setValue(obj) {
	return new Promise(async (res, rej) => {
		const storage = await getStorage();
		if (onChrome) {
			storage.set(obj, res);
		} else {
			storage.set(obj).then(res);
		}
	});
}

function removeValue(keys) {
	return new Promise(async (res, rej) => {
		const storage = await getStorage();
		if (onChrome) {
			storage.remove(keys, res);
		} else {
			storage.remove(keys).then(res);
		}
	});
}
