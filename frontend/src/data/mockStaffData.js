export const dashboardStats = {
  totalTicketsSold: 1245,
  ticketsTrend: "up",
  ticketsTrendValue: "+15%",
  activeScreenings: 12,
  screeningsTrend: "up",
  screeningsTrendValue: "+2",
  todayRevenue: "$15,420",
  revenueTrend: "up",
  revenueTrendValue: "+8%",
  checkedInTickets: 845,
  checkInTrend: "up",
  checkInTrendValue: "+12%"
};

export const recentCheckIns = [
  { id: "TCK-1001", customer: "John Smith", movie: "Dune: Part Two", time: "10:30 AM", status: "Checked In" },
  { id: "TCK-1002", customer: "Emily Johnson", movie: "Dune: Part Two", time: "10:32 AM", status: "Checked In" },
  { id: "TCK-1003", customer: "Michael Brown", movie: "Kung Fu Panda 4", time: "11:05 AM", status: "Checked In" },
  { id: "TCK-1004", customer: "Sarah Davis", movie: "Ghostbusters: Frozen Empire", time: "11:15 AM", status: "Invalid" },
  { id: "TCK-1005", customer: "David Wilson", movie: "Dune: Part Two", time: "11:20 AM", status: "Checked In" },
];

export const showtimesData = [
  { id: 1, movieName: "Dune: Part Two", showTime: "12:00 PM", showDate: "2026-06-08", room: "Theater 1 - IMAX", soldSeats: 150, totalSeats: 200, status: "Active" },
  { id: 2, movieName: "Kung Fu Panda 4", showTime: "01:30 PM", showDate: "2026-06-08", room: "Theater 3", soldSeats: 85, totalSeats: 120, status: "Active" },
  { id: 3, movieName: "Ghostbusters: Frozen Empire", showTime: "02:15 PM", showDate: "2026-06-08", room: "Theater 2", soldSeats: 110, totalSeats: 150, status: "Active" },
  { id: 4, movieName: "Dune: Part Two", showTime: "04:00 PM", showDate: "2026-06-08", room: "Theater 1 - IMAX", soldSeats: 195, totalSeats: 200, status: "Almost Full" },
  { id: 5, movieName: "Civil War", showTime: "05:30 PM", showDate: "2026-06-08", room: "Theater 4", soldSeats: 45, totalSeats: 100, status: "Active" },
  { id: 6, movieName: "Godzilla x Kong", showTime: "07:00 PM", showDate: "2026-06-08", room: "Theater 2", soldSeats: 150, totalSeats: 150, status: "Sold Out" },
  { id: 7, movieName: "Dune: Part Two", showTime: "08:30 PM", showDate: "2026-06-08", room: "Theater 1 - IMAX", soldSeats: 120, totalSeats: 200, status: "Active" },
];

export const ticketsDatabase = {
  "TCK-2001": {
    code: "TCK-2001",
    bookingDate: "2026-06-05",
    customerName: "Alice Cooper",
    customerEmail: "alice@example.com",
    customerPhone: "+1 555-0101",
    movieName: "Dune: Part Two",
    showDate: "2026-06-08",
    showTime: "12:00 PM",
    theaterRoom: "Theater 1 - IMAX",
    seatNumber: "F12",
    status: "Valid"
  },
  "TCK-2002": {
    code: "TCK-2002",
    bookingDate: "2026-06-06",
    customerName: "Bob Builder",
    customerEmail: "bob@example.com",
    customerPhone: "+1 555-0102",
    movieName: "Kung Fu Panda 4",
    showDate: "2026-06-08",
    showTime: "01:30 PM",
    theaterRoom: "Theater 3",
    seatNumber: "A05",
    status: "Checked In"
  },
  "TCK-2003": {
    code: "TCK-2003",
    bookingDate: "2026-06-01",
    customerName: "Charlie Chaplin",
    customerEmail: "charlie@example.com",
    customerPhone: "+1 555-0103",
    movieName: "Ghostbusters",
    showDate: "2026-06-07", // Yesterday
    showTime: "08:00 PM",
    theaterRoom: "Theater 2",
    seatNumber: "C10",
    status: "Expired"
  }
};
