const icons = {
  library: <><path d="M3 10 12 3l9 7v10H3zM9 20v-7h6v7" /></>,
  overview: <><path d="M3 10 12 3l9 7v10H3zM9 20v-7h6v7" /></>,
  search: <><circle cx="10" cy="10" r="6" /><path d="m15 15 5 5" /></>,
  wiki: <><path d="M12 5v15M3 4h5q4 0 4 3 0-3 4-3h5v15h-5q-4 0-4 2-1-2-4-2H3z" /></>,
  sessions: <><path d="M12 5v15M3 4h5q4 0 4 3 0-3 4-3h5v15h-5q-4 0-4 2-1-2-4-2H3z" /></>,
  note: <><rect x="5" y="3" width="14" height="18" rx="2" /><path d="M8 8h8M8 12h8M8 16h5" /></>,
  favorite: <><path d="m12 3 3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1z" /></>,
  people: <><circle cx="9" cy="7" r="3" /><path d="M3 20v-3a6 6 0 0 1 12 0v3M16 4a3 3 0 0 1 0 6M17 13a5 5 0 0 1 4 5v2" /></>,
  pending: <><rect x="4" y="3" width="16" height="18" rx="2" /><path d="m7 8 2 2 3-4M7 15h10M14 8h3" /></>,
  quest: <><path d="M5 21V3m0 1h13l-3 5 3 5H5" /></>,
  info: <><circle cx="12" cy="12" r="9" /><path d="M12 11v6M12 7h.01" /></>,
  clip: <><path d="m8 13 7-7a3 3 0 0 1 4 4l-9 9a5 5 0 0 1-7-7l9-9m-5 12 7-7" /></>,
  arrow: <><path d="m9 6 6 6-6 6" /></>,
  plus: <><path d="M12 5v14M5 12h14" /></>,
  menu: <><path d="M4 6h16M4 12h16M4 18h16" /></>,
  rail: <><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M9 4v16" /></>,
  file: <><path d="M5 3h9l5 5v13H5zM14 3v6h5M8 13h8M8 17h8" /></>,
} as const

export function NavigationIcon({ name }: { name: keyof typeof icons }) {
  return <svg className="destination-icon" viewBox="0 0 24 24" width="19" height="19" aria-hidden="true"
    fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round">
    {icons[name]}
  </svg>
}
