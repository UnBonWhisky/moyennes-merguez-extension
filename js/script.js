const $spanSummary = $("<span class=\"mg_inherit_color\" id=\"moyennes-myges-moyenne-generale\">");
const $simModeButton = $("<button id=\"moyennes-myges-btn-sim\" type=\"button\" class=\"ui-button ui-widget ui-state-default ui-corner-all ui-button-icon-only noBorder\"\
							role=\"button\" aria-disabled=\"false\" data-balloon=\"Activer le mode simulation&#10;Permet de modifier les notes afin d'estimer sa moyenne\" data-balloon-pos=\"up\" data-balloon-break>\
							<span class=\"ui-button-icon-left ui-icon ui-c pen-icon16_blue\"></span>\
							<span class=\"ui-button-text ui-c\">ui-button</span>\
						</button>");
const $simAddCcButton = $("<button id=\"moyennes-myges-btn-add-cc\" style=\"display: none;\" type=\"button\" class=\"ui-button ui-widget ui-state-default ui-corner-all ui-button-icon-only noBorder\"\
							role=\"button\" aria-disabled=\"false\" data-balloon=\"Ajouter une colonne de CC\" data-balloon-pos=\"up\" data-balloon-break>\
							<span class=\"ui-button-icon-left ui-icon ui-c add-icon16_fill_blue\"></span>\
							<span class=\"ui-button-text ui-c\">ui-button</span>\
						</button>");
$("#marksWidget .mg_title").append($simModeButton);
$("#marksWidget .mg_title").append($simAddCcButton);
$("#marksWidget .mg_content").append($spanSummary);

let semesters = {};

class Average {
	constructor() {
		this.sum = 0.0;
		this.coefs = 0.0;
	}

	addMark(mark, coef = 1) {
		this.sum += mark * coef;
		this.coefs += coef;
	}

	get value() {
		return this.sum / this.coefs;
	}

	get printableValue() {
		return getPrintableMark(this.value);
	}
}

async function loadMarks(takeNoCoeffSubjects) {
	if (takeNoCoeffSubjects === undefined) {
		const obj = await getValue("take_no_coeff_subjects");
		loadMarks(obj.take_no_coeff_subjects === true);
		return;
	}

	observer.disconnect();
	$spanSummary.text("");

	const $table = $("#marksWidget table");
	const $rows = $table.find("tbody tr");
	const subjects = [];
	let ects = 0;
	let points = 0;
	let coefs = 0;
	const selectedSemester = getSelectedSemester();
	let addedAverageColumn = $table.find("thead tr th.average-column").length > 0;

	for (const r of $rows) {
		const s = {
			"marks": [],
			"exam": false,
			"avg": false,
			"avgcc": false
		};
		const $r = $(r);
		const $tds = $r.find("td");
		s.coef = parseFloat(cellValue($tds.eq(2)));
		if (isNaN(s.coef)) {
			if (takeNoCoeffSubjects === true && $tds.eq(2).text().indexOf("N.C") > -1) {
				s.coef = 1;
				if ($tds.eq(2).find(".fake-coefficient").length === 0) {
					$tds.eq(2).append(` <span class="moyennes-myges-blue fake-coefficient">(${s.coef})</span>`);
				}
			} else {
				continue;
			}
		}
		let credits = parseFloat(cellValue($tds.eq(3)));
		if ($tds.eq(3).text().indexOf("N.C") > -1 && takeNoCoeffSubjects === true) {
			credits = 1;
			if ($tds.eq(3).find(".fake-coefficient").length === 0) {
				$tds.eq(3).append(` <span class="moyennes-myges-blue fake-coefficient">(${credits})</span>`);
			}
		}
		const $marks = $tds.slice(4);
		let examIndex = $marks.length - 1;
		if (addedAverageColumn) {
			examIndex--; // Otherwise the Average column would be used as the Exam value
		}
		let sumMarks = 0;
		$marks.each((i, m) => {
			let mark = cellValue($(m));
			if (typeof mark === "string" || mark instanceof String) {
				mark = parseFloat(mark.replace(",", "."));
			}
			if (isNaN(mark)) {
				return;
			}
			if (mark > 20) {
				return; // Do not count "score" grades (TOEIC for instance)
			}
			if (i == examIndex) {
				s.exam = mark;
			} else if (i < examIndex) {
				s.marks.push(mark);
				sumMarks += mark;
			}
		});
		if (s.marks.length > 0) {
			s.avg = sumMarks / s.marks.length;
			s.avgcc = s.avg;
		}
		if (s.exam !== false) {
			if (s.avg === false) {
				s.avg = s.exam;
			} else {
				s.avg = (s.avg + s.exam) / 2;
			}
		}
		if (s.avg !== false) {
			$r.data("avg", s.avg);
			subjects.push(s);
			if (!isNaN(credits) && !isNaN(s.avg)) {
				if (s.avg >= 10.0 && s.coef > 0) {
					ects += credits;
					$tds.eq(3).addClass("moyennes-myges-green");
				} else {
					$tds.eq(3).addClass("moyennes-myges-red");
				}
			}
			points += s.avg * s.coef;
			coefs += s.coef;
		}
	}

	if (!addedAverageColumn) {
		$table.find("thead tr").eq(0).append("<th class=\"ui-state-default average-column\" role=\"columnheader\" style=\"width: 55px; text-align: center\"><span class=\"ui-column-title\">Moyenne</span></th>");
		for (const r of $rows) {
			const $r = $(r);
			$r.append("<td style=\"width:55px; text-align: center\"><span class=\"moyennes-myges-subject-avg\"></span></td>");
		}
		addedAverageColumn = true;
	}
	for (const r of $rows) {
		const $r = $(r);
		let value = "";
		if ($r.data("avg") != undefined) {
			value = getPrintableMark($r.data("avg"));
		}
		$r.find("> td:last").text(value);
	}

	if (subjects.length > 0) {
		const ccs = new Average();
		const exams = new Average();
		for (const s of subjects) {
			if (s.avgcc !== false) {
				ccs.addMark(s.avgcc, s.coef);
			}
			if (s.exam !== false) {
				exams.addMark(s.exam, s.coef);
			}
		}

		semesters[selectedSemester] = {
			"points": points,
			"coefs": coefs
		};
		const year = extractYearFromSemester(selectedSemester);
		const yearly = computeYearlyAverage(year);

		const sp = "&emsp;&emsp;";
		let html = "<br>&ensp;";
		html += `Moyenne générale : <strong>${getPrintableMark(points / coefs)}</strong>`;
		html += `${sp}Points : <strong>${getPrintableMark(points)}</strong>`;
		html += `${sp}Coefs : <strong>${coefs}</strong>`;
		html += `${sp}ECTS : <strong>${ects}</strong>`;
		html += `${sp}Moyenne des CC : <strong>${ccs.printableValue}</strong>`;
		if (!isNaN(exams.value)) {
			html += `${sp}Moyenne des examens : <strong>${exams.printableValue}</strong>`;
		}
		if (yearly != null) {
			html += `${"<br><br>&ensp;" + "Moyenne générale sur l'année "}${year} : <strong>${getPrintableMark(yearly)}</strong>`;
		}
		html += "<br><br>";
		$spanSummary.html(html);
	} else {
		$spanSummary.html("");
	}
	observe();
}

const observer = new MutationObserver(() => {
	loadMarks();
});
const config = { attributes: false, childList: true, subtree: true, characterData: true };

function observe() {
	const $widget = $("#marksWidget");
	if ($widget.length === 0) {
		return;
	}
	observer.observe($widget[0], config);
}

observe();
loadMarks();

function getPrintableMark(m) {
	if (isNaN(m)) {
		return "Ø";
	}
	return (Math.round(m * 100) / 100).toString().replace(".", ",");
}

function getSelectedSemester() {
	// We use "getElementById" since jQuery thinks the colons in the id are pseudo-elements
	return $("[id^='marksForm'][id$='periodSelect_label']").text();
}

function extractYearFromSemester(semester) {
	let bits = semester.split("-");
	bits = bits.slice(0, -1);
	let year = bits.join("-");
	year = year.trim();
	return year;
}

function computeYearlyAverage(year) {
	let points = 0;
	let coefs = 0;
	let count = 0; // Number of semesters used

	for (const k in semesters) {
		if (!semesters.hasOwnProperty(k)) continue;
		const s = semesters[k];
		if (k.indexOf(year) != -1) {
			points += s.points;
			coefs += s.coefs;
			count++;
		}
	}

	if (count > 1 && coefs > 0) {
		return points / coefs;
	}
	return null;
}

let simMode = false;
let $simModeTableBackup = null;
let simModeSemestersBackup = {};
const $tdSemesterSelector = $("#marksForm > table tbody tr:eq(0) td:eq(1)");
$tdSemesterSelector.append($("<div style=\"color: #5D5D5D\"><i>Veuillez quitter le mode simulation afin de changer de semestre.</i></div>").hide());

$simModeButton.add($simAddCcButton).on("mouseleave mouseup", (ev) => {
	$(ev.target).blur();
});
$simModeButton.on("click", async () => {
	$simModeButton.toggleClass("noBorder");
	simMode = !simMode;

	if (simMode) { // Entering into sim mode
		const takeNoCoeffSubjects = (await getValue("take_no_coeff_subjects")).take_no_coeff_subjects;

		$simModeTableBackup = $("#marksWidget table").clone(true); // Copy the table so that we can load it in its original state after the simulation
		simModeSemestersBackup = { ...semesters }; // Copy the semester values so that we can reload them after the simulation
		$tdSemesterSelector.find("> div").eq(0).hide(); // Prevent the user from selecting another semester while in sim mode
		$tdSemesterSelector.find("> div").eq(1).show();

		const $table = $("#marksWidget table");
		const $rows = $table.find("tbody tr");
		for (const r of $rows) {
			const $r = $(r);
			const $tds = $r.find("td");
			let i = 0;
			for (const td of $tds) {
				if (i > 1 && i != $tds.length - 1) { // Skip for "Matières", "Intervenant" and "Moyenne"
					const $td = $(td);
					let val = $td.text();
					val = val.replace(",", ".");
					if (val == "" || !isNaN(val) || val.indexOf("N.C") > -1) {
						if (takeNoCoeffSubjects && val.indexOf("N.C") > -1) {
							val = 1;
						}
						const $input = buildCellInput(val);
						$td.addClass("moyennes-myges-td-editable");
						$td.html($input);
					}
				}
				i++;
			}
		}
		$simAddCcButton.show();
	} else { // Exitting sim mode
		observer.disconnect();
		$simAddCcButton.hide();
		$("#marksWidget table").replaceWith($simModeTableBackup); // Restore the table's original state
		semesters = { ...simModeSemestersBackup };
		observe();
		loadMarks();
		$tdSemesterSelector.find("> div").eq(1).hide();
		$tdSemesterSelector.find("> div").eq(0).show(); // Reallow the user to select another semester
	}
});
$simAddCcButton.on("click", () => {
	const $table = $("#marksWidget table");
	const $ths = $table.find("thead tr th");
	let i = 0;
	let n = 1;
	let index = 0;
	for (const th of $ths) {
		if ($(th).text().indexOf("CC") != -1) {
			n++;
			index = i;
		}
		i++;
	}
	if (index == 0 && n == 1) {
		index = 3;
	}
	const $th = $(`<th class="ui-state-default" role="columnheader" style="width: 45px; text-align: center"><span class="ui-column-title">CC${n}</span></th>`);
	$table.find(`thead tr th:eq(${index})`).after($th);
	for (const r of $table.find("tbody tr")) {
		const $r = $(r);
		const $td = $("<td class=\"moyennes-myges-td-editable\"></td>");
		$td.append(buildCellInput());
		$r.find(`td:eq(${index})`).after($td);
	}
});

function cellValue($c) {
	if ($c.hasClass("moyennes-myges-td-editable")) {
		return $c.find("input").val();
	} else {
		return $c.text();
	}
}

const cellInputOnInput = (ev) => {
	const $cell = $(ev.target);
	let v = $cell.val();
	if (v != "") {
		v = Math.min(Math.max(v, 0), 20);
	}
	$cell.val(v);
	loadMarks();
};
function buildCellInput(val) {
	const $inp = $("<input type=\"number\" step=\"0.25\" min=\"0\" max=\"20\">");
	if (val !== undefined) {
		$inp.val(val);
	}
	$inp.on("input", cellInputOnInput);
	return $inp;
}
