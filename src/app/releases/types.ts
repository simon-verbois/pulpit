export interface ReleaseNotes {
  version: string;
  date: string;
  sections: { title: string; entries: string[] }[];
}
