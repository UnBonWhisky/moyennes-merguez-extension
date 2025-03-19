const actionHandlers = {
    "initGrades": async (args) => {
        await initGrades();
    },
    "initAbsences": async (args) => {
        await initAbsences();
    }
};

browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
	if (actionHandlers[request.type]) {
        actionHandlers[request.type](request.args);  // Appel de la fonction correspondant à l'action demandée
    } else {
        console.error("Type de requête non reconnu :", request.type);
    }
});

browser.notifications.onClicked.addListener((id) => {
	browser.notifications.clear(id);
	browser.tabs.create({
		"url": "https://myges.fr/student/marks",
	});
});

(() => {
	later.date.localTime();
	const schedule = later.parse.cron("*/30 * * * *");
	later.setInterval(poll, schedule);
	if (later.schedule(schedule).next(1) - new Date() > 5 * 60 * 1000) {
		// Manually poll at startup if the first automatic poll is in more than 5 minutes
		poll();
	}
})();

async function poll() {
	await refreshTokenIfNecessary();

	const pollGrades = async () => {
		let enabled = await areGradesNotificationsEnabled();
		if (!enabled) {
			return;
		}

		const grades = await fetchGrades();
		const storedGrades = await loadGrades();
		for (const yearGrades of grades) {
			const newGrades = compareGrades(storedGrades, yearGrades);
			let numberOfCourses = 0;
			let numberOfGrades = 0;
			let lastCourse = "";
			for (const course in newGrades) {
				if (!newGrades.hasOwnProperty(course)) {
					continue;
				}
				numberOfCourses++;
				numberOfGrades += newGrades[course];
				lastCourse = course;
			}
			makeGradeNotification(numberOfCourses, numberOfGrades, lastCourse);
			await saveGrades(yearGrades);
		}
	};

	const pollAbsences = async () => {
		enabled = await areAbsencesNotificationsEnabled();
		if (!enabled) {
			return;
		}

		const absences = await fetchAbsences();
		const storedAbsences = await loadAbsences();
		for (const yearAbsences of absences) {
			const diff = compareAbsences(storedAbsences, yearAbsences);

			numberOfCourses = 0;
			let numberOfAbsences = 0;
			let numberJustified = 0;
			lastCourse = "";
			for (const course in diff) {
				if (!diff.hasOwnProperty(course)) {
					continue;
				}
				if (diff[course].new.length > 0) {
					numberOfCourses++;
					numberOfAbsences += diff[course].new.length;
					for (const abs of diff[course].new) {
						if (abs.justified) {
							numberJustified++;
						}
					}
					lastCourse = course;
				}
			}
			makeNewAbsenceNotification(numberOfCourses, numberOfAbsences, numberJustified, lastCourse);

			numberOfCourses = 0;
			numberJustified = 0;
			lastCourse = "";
			for (const course in diff) {
				if (!diff.hasOwnProperty(course)) {
					continue;
				}
				if (diff[course].justified.length > 0) {
					numberOfCourses++;
					numberJustified += diff[course].justified.length;
					lastCourse = course;
				}
			}
			makeJustifiedAbsenceNotification(numberOfCourses, numberJustified, lastCourse);
			await saveAbsences(yearAbsences);
		}
	};

	await Promise.all([pollGrades(), pollAbsences()]);
}

function compareGrades(storedGrades, grades) {
	const newGrades = {};
	for (const grade of grades) {
		if (grade.year in storedGrades &&
			grade.trimester in storedGrades[grade.year] &&
			grade.course in storedGrades[grade.year][grade.trimester]) {

			const storedGrade = storedGrades[grade.year][grade.trimester][grade.course];
			const newExam = storedGrade.exam == null && grade.exam != null;
			const newCc = grade.grades.length > storedGrade.grades.length;
			if ((newExam || newCc) && !(grade.course in newGrades)) {
				newGrades[grade.course] = 0;
			}
			if (newExam) {
				newGrades[grade.course]++;
			}
			if (newCc) {
				newGrades[grade.course] += grade.grades.length - storedGrade.grades.length;
			}
		}
	}
	return newGrades;
}

function compareAbsences(storedAbsences, absences) {
	const diff = {};

	const buildDiffTree = (abs) => {
		if (!(abs.course_name in diff)) {
			diff[abs.course_name] = {
				"new": [],
				"justified": [],
			};
		}
	};

	const addNewCourseAbsence = (abs) => {
		buildDiffTree(abs);
		diff[abs.course_name].new.push({
			"date": abs.date,
			"justified": abs.justified,
		});
	};

	const addJustifiedCourseAbsence = (abs) => {
		buildDiffTree(abs);
		diff[abs.course_name].justified.push({
			"date": abs.date,
		});
	};

	for (const abs of absences) {
		if (abs.year in storedAbsences &&
			abs.trimester in storedAbsences[abs.year] &&
			abs.course_name in storedAbsences[abs.year][abs.trimester]) {

			const courseAbsences = storedAbsences[abs.year][abs.trimester][abs.course_name];
			const found = courseAbsences[abs.date];
			if (found !== undefined) {
				if (!found.justified && abs.justified) {
					addJustifiedCourseAbsence(abs);
				}
			} else {
				addNewCourseAbsence(abs);
			}
		} else {
			addNewCourseAbsence(abs);
		}
	}

	return diff;
}

function makeGradeNotification(numberOfCourses, numberOfGrades, course) {
	if (numberOfCourses == 0) {
		return;
	}

	let text = "";
	if (numberOfCourses > 1) {
		text = `${numberOfGrades} nouvelles notes ont été mises en ligne`;
	} else {
		if (numberOfGrades == 1) {
			text = `Une nouvelle note a été mise en ligne en ${course}`;
		} else {
			text = `${numberOfGrades} nouvelles notes ont été mises en ligne en ${course}`;
		}
	}
	if (text != "") {
		makeNotification(text);
	}
}

function makeNewAbsenceNotification(numberOfCourses, numberOfAbsences, numberJustified, course) {
	if (numberOfCourses == 0) {
		return;
	}

	let text = "";
	if (numberOfCourses > 1) {
		if (numberJustified == numberOfAbsences) {
			text = `${numberOfAbsences} absences justifiées ont été ajoutées`;
		} else if (numberJustified == 0) {
			text = `${numberOfAbsences} absences injustifiées ont été ajoutées`;
		} else {
			const plural = numberJustified > 1 ? "s" : "";
			text = `${numberOfAbsences} absences ont été ajoutées (dont ${numberJustified} justifiée${plural})`;
		}
	} else {
		if (numberOfAbsences == 1) {
			if (numberJustified == 1) {
				text = `Une absence justifiée a été ajoutée en ${course}`;
			} else {
				text = `Une absence injustifiée a été ajoutée en ${course}`;
			}
		} else {
			if (numberJustified == numberOfAbsences) {
				text = `${numberOfAbsences} absences justifiées ont été ajoutées en ${course}`;
			} else if (numberJustified == 0) {
				text = `${numberOfAbsences} absences injustifiées ont été ajoutées en ${course}`;
			} else {
				const plural = numberJustified > 1 ? "s" : "";
				text = `${numberOfAbsences} absences ont été ajoutées en ${course} (dont ${numberJustified} justifiée${plural})`;
			}
		}
	}
	if (text != "") {
		makeNotification(text);
	}
}

function makeJustifiedAbsenceNotification(numberOfCourses, numberJustified, course) {
	if (numberOfCourses == 0) {
		return;
	}

	let text = "";
	if (numberOfCourses > 1) {
		text = `${numberJustified} absences ont été marquées comme justifiées`;
	} else {
		if (numberJustified == 1) {
			text = `Une absence a été marquée comme justifiée en ${course}`;
		} else {
			text = `${numberJustified} absences ont été marquées comme justifiées en ${course}`;
		}
	}
	if (text != "") {
		makeNotification(text);
	}
}

function makeNotification(text) {
	const options = {
		"type": "basic",
		"message": text,
		"title": "Moyennes myGES",
		"iconUrl": "/img/256.png"
	};
	browser.notifications.create(options);
}

async function refreshTokenIfNecessary() {
	return new Promise(async (res, rej) => {
		const expirationDate = await loadTokenExpirationDate();
		const now = new Date();
		if (expirationDate == null || now >= expirationDate) {
			const credentials = loadCredentials();
			if (credentials == null) {
				return;
			}
			fetchAccessToken(credentials, async (token, expireDate) => {
				await saveToken(token, expireDate);
				res();
			});
		} else {
			res();
		}
	});
}

async function fetchYears() {
    return new Promise(async (res, rej) => {
        const token = await loadToken();

        fetch("https://api.kordis.fr/me/years", {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${token}`
            },
            timeout: 5000
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`Erreur HTTP ! Statut: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            res(data.result);
        })
        .catch(error => {
            rej(error);
        });
    });
}


async function fetchGrades() {
    const token = await loadToken();
    const years = await fetchYears();

    const promises = years.map((year) => new Promise(async (res, rej) => {
        const timeout = new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Requête expirée")), 5000)
        );

        const fetchRequest = fetch(`https://api.kordis.fr/me/${year}/grades`, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${token}`
            }
        })
        .then(response => {
            if (!response.ok) {
                res([]);
            } else {
                return response.json();
            }
        })
        .then(data => {
            if (data && data.result) {
                res(data.result);
            } else {
                res([]);
            }
        })
        .catch(error => {
            rej(error);
        });

        Promise.race([fetchRequest, timeout])
            .catch(error => rej(error));
    }));
    
    return await Promise.all(promises);
}


async function initGrades() {
	await clearGrades();
	const grades = await fetchGrades();
	await saveGrades(grades);
}

async function fetchAbsences() {
    const token = await loadToken();
    const years = await fetchYears();

    const promises = years.map((year) => new Promise(async (res, rej) => {
        const timeout = new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Requête expirée")), 5000)
        );

        const fetchRequest = fetch(`https://api.kordis.fr/me/${year}/absences`, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${token}`
            }
        })
        .then(response => {
            if (!response.ok) {
                res([]);
            } else {
                return response.json();
            }
        })
        .then(data => {
            if (data && data.result) {
                res(data.result);
            } else {
                res([]);
            }
        })
        .catch(error => {
            rej(error);
        });

        Promise.race([fetchRequest, timeout])
            .catch(error => rej(error));
    }));

    return await Promise.all(promises);
}


async function initAbsences() {
	await clearAbsences();
	const absences = await fetchAbsences();
	await saveAbsences(absences);
}
