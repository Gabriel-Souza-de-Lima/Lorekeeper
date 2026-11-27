const paths = {
  library: 'M3 4h5v16H3z M10 4h5v16h-5z M17 5l4-1 3 15-4 1z',
  search: 'M20 20l-5-5 M17 11a6 6 0 1 1-12 0 6 6 0 0 1 12 0z',
  favorite: 'M12 3l2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9z',
  note: 'M5 3h14v14l-4 4H5z M8 8h8 M8 12h8 M15 21v-4h4',
  overview: 'M3 11l9-8 9 8 M5 10v10h14V10 M10 20v-5h4v5',
  sessions: 'M5 4h14v16H5z M5 8h14 M9 12h6 M9 16h6',
  wiki: 'M12 6c-3-2-6-2-9-1v14c3-1 6-1 9 1 3-2 6-2 9-1V5c-3-1-6-1-9 1z M12 6v14',
  people: 'M9 12a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M3 19v-2c0-2 2-3 6-3s6 1 6 3v2z M16 6a3 3 0 0 1 0 6 M17 14c3 0 4 1 4 3v2',
  pending: 'M5 4h14v16H5z M8 8l1 1 2-2 M13 8h3 M8 13l1 1 2-2 M13 13h3',
  info: 'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z M12 11v6 M12 7v1',
  quick: 'M4 5h16v14H4z M8 9l3 3-3 3 M13 15h3',
} as const

export function NavigationIcon({ name }: { name: keyof typeof paths }) {
  return <svg className="destination-icon" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"
    fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round">
    <path d={paths[name]} />
  </svg>
}
