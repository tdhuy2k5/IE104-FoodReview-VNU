const paths = {
  thumbUp: "M7 10v11H3V10h4Zm0 0 5-8c3 0 3 3 2 7h5a2 2 0 0 1 2 2l-2 8a2 2 0 0 1-2 2H7",
  thumbDown: "M7 14V3H3v11h4Zm0 0 5 8c3 0 3-3 2-7h5a2 2 0 0 0 2-2l-2-8a2 2 0 0 0-2-2H7",
  fork: "M4 3v6c0 3 6 3 6 0V3M7 3v18M20 21V3c-5 1-6 6-6 10h6",
  search: "M21 21l-5-5M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0",
  pin: "M20 10c0 6-8 11-8 11S4 16 4 10a8 8 0 1 1 16 0M15 10a3 3 0 1 1-6 0 3 3 0 0 1 6 0",
  star: "m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9L12 3Z",
  bookmark: "M6 3h12v18l-6-4-6 4V3Z",
  arrow: "M4 12h16m-6-6 6 6-6 6",
  filter: "M3 6h18M6 12h12M9 18h6",
  clock: "M12 8v5l3 2M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0",
  user: "M20 21v-2a6 6 0 0 0-6-6h-4a6 6 0 0 0-6 6v2M16 6a4 4 0 1 1-8 0 4 4 0 0 1 8 0",
  menu: "M4 6h16M4 12h16M4 18h16",
  close: "m6 6 12 12M6 18 18 6",
  leaf: "M20 3C10 2 2 7 5 15s16 3 15-12ZM4 21 16 9",
  message: "M21 15a3 3 0 0 1-3 3H8l-5 3V6a3 3 0 0 1 3-3h12a3 3 0 0 1 3 3v9Z",
  camera: "M3 7h4l2-3h6l2 3h4v14H3V7Zm13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0",
  flag: "M5 22V3c5-4 9 4 15 0v11c-6 4-10-4-15 0",
  check: "m5 12 4 4L20 5",
  chevron: "m9 5 7 7-7 7",
  info: "M12 11v6M12 7h.01M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0",
  sun: "M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1 1m12 12 1 1M5 19l1-1M18 6l1-1M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0",
};
export function Icon({
  name,
  size = 20,
  className = "",
}: {
  name: keyof typeof paths;
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      data-icon={name}
      aria-hidden="true"
    >
      <path d={paths[name]} />
    </svg>
  );
}
