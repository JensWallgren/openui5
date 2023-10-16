export class CalendarWeekNumbering {
	static Default = "Default";
	static ISO_8601 = "ISO_8601";
	static MiddleEastern = "MiddleEastern";
	static WesternTraditional = "WesternTraditional";

	static getWeekConfigurationValues(sCalendarWeekNumbering) {
		switch (sCalendarWeekNumbering) {
			case CalendarWeekNumbering.ISO_8601:
				return {firstDayOfWeek: 1, minimalDaysInFirstWeek: 4};
			case CalendarWeekNumbering.MiddleEastern:
				return {firstDayOfWeek: 6, minimalDaysInFirstWeek: 1};
			case CalendarWeekNumbering.WesternTraditional:
				return {firstDayOfWeek: 0, minimalDaysInFirstWeek: 1};
			default:
				return undefined;
		}
	}
}
