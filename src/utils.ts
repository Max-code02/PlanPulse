import { TimetableEntry, SubstitutionNotice } from "./types";

export const PERIOD_TIMES = [
  { period: 1, time: "08:00 - 08:45" },
  { period: 2, time: "08:50 - 09:35" },
  { period: 3, time: "09:55 - 10:40" },
  { period: 4, time: "10:45 - 11:30" },
  { period: 5, time: "11:45 - 12:30" },
  { period: 6, time: "12:35 - 13:20" },
  { period: 7, time: "14:00 - 15:30" },
  { period: 8, time: "15:45 - 17:15" },
];

export const DAYS: Array<{ key: "Mo" | "Di" | "Mi" | "Do" | "Fr"; label: string; full: string }> = [
  { key: "Mo", label: "Mo", full: "Montag" },
  { key: "Di", label: "Di", full: "Dienstag" },
  { key: "Mi", label: "Mi", full: "Mittwoch" },
  { key: "Do", label: "Do", full: "Donnerstag" },
  { key: "Fr", label: "Fr", full: "Freitag" },
];

export function exportToCSV(entries: TimetableEntry[], substitutions: SubstitutionNotice[]): void {
  let csvContent = "data:text/csv;charset=utf-8,";
  csvContent += "=== STUNDENPLAN ===\n";
  csvContent += "Tag;Stunde;Uhrzeit;Fach;Lehrkraft;Raum;Klasse;Status;Notiz\n";
  entries.forEach((e) => {
    csvContent += `"${e.day}";"${e.period}";"${e.time}";"${e.subject}";"${e.teacher}";"${e.room}";"${e.targetClass}";"${e.status}";"${e.note || ""}"\n`;
  });

  csvContent += "\n=== VERTRETUNGSPLAN ===\n";
  csvContent += "Datum;Stunde;Klasse;Fach;UrspruenglicheLehrkraft;Vertretung;Raum;Art;Info\n";
  substitutions.forEach((s) => {
    csvContent += `"${s.date}";"${s.period}";"${s.targetClass}";"${s.subject}";"${s.originalTeacher}";"${s.substituteTeacher}";"${s.room}";"${s.type}";"${s.info}"\n`;
  });

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `PlanPulse_Export_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function exportToJSON(entries: TimetableEntry[], substitutions: SubstitutionNotice[]): void {
  const data = {
    app: "PlanPulse Micro-SaaS",
    exportedAt: new Date().toISOString(),
    timetable: entries,
    substitutions: substitutions,
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `planpulse-backup-${new Date().toISOString().slice(0, 10)}.json`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportToICal(entries: TimetableEntry[]): void {
  let ics = "BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//PlanPulse//Stundenplan Export//DE\nCALSCALE:GREGORIAN\n";
  
  const dayOffsets: Record<string, number> = { Mo: 1, Di: 2, Mi: 3, Do: 4, Fr: 5 };
  const today = new Date();
  const currentDay = today.getDay(); // 0 is Sun
  const monday = new Date(today);
  monday.setDate(today.getDate() - (currentDay === 0 ? 6 : currentDay - 1));

  entries.forEach((e) => {
    const offset = (dayOffsets[e.day] || 1) - 1;
    const eventDate = new Date(monday);
    eventDate.setDate(monday.getDate() + offset);

    const [startTime, endTime] = e.time.split(" - ");
    const [startH, startM] = (startTime || "08:00").split(":").map(Number);
    const [endH, endM] = (endTime || "08:45").split(":").map(Number);

    const formatICSDate = (d: Date, h: number, m: number) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      const hour = String(h).padStart(2, "0");
      const minute = String(m).padStart(2, "0");
      return `${year}${month}${day}T${hour}${minute}00`;
    };

    ics += "BEGIN:VEVENT\n";
    ics += `UID:planpulse-${e.id}@planpulse.local\n`;
    ics += `SUMMARY:${e.subject} (${e.targetClass})\n`;
    ics += `DESCRIPTION:Lehrer: ${e.teacher} | Raum: ${e.room} ${e.note ? "\\nNotiz: " + e.note : ""}\n`;
    ics += `LOCATION:${e.room}\n`;
    ics += `DTSTART:${formatICSDate(eventDate, startH, startM)}\n`;
    ics += `DTEND:${formatICSDate(eventDate, endH, endM)}\n`;
    ics += "END:VEVENT\n";
  });

  ics += "END:VCALENDAR";

  const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `planpulse-schedule.ics`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
