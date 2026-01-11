export type MeetingType = 'LECTURE' | 'SECTION' | 'UNKNOWN';

export interface ParsedMeeting {
  day: 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | string;
  course_code: string | null;
  location: { building: string | null; room: string | null; mapped?: boolean };
  start_time: string | null;
  end_time: string | null;
  duration_minutes: number | null;
  meeting_type: MeetingType;
  raw_text: string;
}

export interface GroupedCourse {
  course_code: string;
  lectures: ParsedMeeting[];
  sections: ParsedMeeting[];
  others: ParsedMeeting[];
}
