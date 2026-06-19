// Mock Cinema booking data

export const MOCK_MOVIES = [
  {
    id: '1',
    title: 'Vây Hãm: Kẻ Trừng Phạt (The Roundup: Punishment)',
    originalTitle: 'The Roundup: Punishment',
    posterUrl: '/placeholder.svg',
    backdropUrl: '/placeholder.svg',
    genre: 'Hành Động, Hình Sự, Kịch Tính',
    durationMinutes: 109,
    ageRating: 'T18', // 18+
    description: 'Thanh tra quái kiệt Ma Seok-do trở lại để truy lùng một tổ chức đánh bạc trực tuyến bất hợp pháp quy mô lớn do cựu đặc nhiệm Baek Chang-gi điều hành. Trận chiến khốc liệt giữa nắm đấm công lý và những âm mưu tàn độc công nghệ cao bắt đầu.',
    director: 'Heo Myeong-haeng',
    actors: 'Ma Dong-seok, Kim Moo-yul, Park Ji-hwan, Lee Dong-hwi',
    releaseDate: '2026-06-12',
    language: 'Tiếng Hàn (Phụ đề Tiếng Việt)',
    score: 8.8,
    isNowShowing: true,
    trailerUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ' // Dummy trailer link
  },
  {
    id: '2',
    title: 'Hành Tinh Khỉ: Vương Quốc Mới (Kingdom of the Planet of the Apes)',
    originalTitle: 'Kingdom of the Planet of the Apes',
    posterUrl: '/placeholder.svg',
    backdropUrl: '/placeholder.svg',
    genre: 'Khoa Học Viễn Tưởng, Hành Động, Phiêu Lưu',
    durationMinutes: 145,
    ageRating: 'T13', // 13+
    description: 'Nhiều thế hệ sau triều đại của Caesar, loài khỉ hiện là loài thống trị sống hòa hợp trong khi con người bị đẩy vào bóng tối. Khi một thủ lĩnh khỉ chuyên chế mới xây dựng đế chế của mình, một chú khỉ trẻ tuổi bắt đầu cuộc hành trình gian khổ, khiến anh ta phải đặt câu hỏi về mọi thứ mình từng biết về quá khứ.',
    director: 'Wes Ball',
    actors: 'Owen Teague, Freya Allan, Kevin Durand, Peter Macon',
    releaseDate: '2026-06-10',
    language: 'Tiếng Anh (Phụ đề Tiếng Việt & Lồng tiếng)',
    score: 8.2,
    isNowShowing: true,
    trailerUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ'
  },
  {
    id: '3',
    title: 'Doraemon: Bản Giao Hưởng Địa Cầu',
    originalTitle: 'Doraemon the Movie: Nobita\'s Earth Symphony',
    posterUrl: '/placeholder.svg',
    backdropUrl: '/placeholder.svg',
    genre: 'Hoạt Hình, Gia Đình, Phiêu Lưu',
    durationMinutes: 115,
    ageRating: 'P', // Public / All ages
    description: 'Doraemon, Nobita và những người bạn cùng thực hiện một chuyến phiêu lưu âm nhạc để cứu thế giới khỏi hiểm họa diệt vong do một sinh vật bí ẩn đe dọa nuốt chửng âm nhạc trên toàn Trái Đất.',
    director: 'Imai Kazuaki',
    actors: 'Mizuta Wasabi, Ohara Megumi, Kakazu Yumi, Kimura Subaru',
    releaseDate: '2026-06-01',
    language: 'Tiếng Nhật (Phụ đề Tiếng Việt & Lồng tiếng)',
    score: 9.0,
    isNowShowing: true,
    trailerUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ'
  }
];

// Generate active dates for booking (next 5 days)
export const getActiveDates = () => {
  const dates = [];
  const daysOfWeek = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
  
  for (let i = 0; i < 5; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    
    const dayName = i === 0 ? 'Hôm nay' : daysOfWeek[d.getDay()];
    const dateStr = d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
    const fullDateStr = d.toISOString().split('T')[0]; // YYYY-MM-DD
    
    dates.push({
      id: `date-${i}`,
      dayName,
      dateStr,
      fullDate: fullDateStr
    });
  }
  return dates;
};

// Mock Showtimes matching movies and dates
export const MOCK_SHOWTIMES = {
  // Key format: `${movieId}_${dateId}`
  // Let's generate a helper to get showtimes programmatically if not defined
};

// Generate deterministic showtimes for all movies and dates
export const getShowtimesForMovieAndDate = (movieId, dateId) => {
  // Deterministic generation so we always have showtimes
  const formats = ['2D', '3D', 'IMAX 2D'];
  const rooms = {
    '2D': ['Phòng chiếu 1', 'Phòng chiếu 2', 'Phòng chiếu 4'],
    '3D': ['Phòng chiếu 3'],
    'IMAX 2D': ['Phòng chiếu IMAX']
  };
  
  const baseTimes = [
    { time: '09:00', format: '2D' },
    { time: '11:30', format: '2D' },
    { time: '14:15', format: 'IMAX 2D' },
    { time: '16:45', format: '2D' },
    { time: '18:00', format: '3D' },
    { time: '19:30', format: 'IMAX 2D' },
    { time: '21:15', format: '2D' },
    { time: '22:45', format: '2D' }
  ];

  // Modify base times based on movieId and dateId to give unique feeling
  const numMovie = parseInt(movieId, 10) || 1;
  const numDate = parseInt(dateId.replace('date-', ''), 10) || 0;
  
  const selectedTimes = baseTimes.filter((_, idx) => {
    // vary the showtimes per movie and date
    return (idx + numMovie + numDate) % 2 === 0 || idx % 3 === 0;
  });

  return selectedTimes.map((item, index) => {
    const formatRooms = rooms[item.format] || ['Phòng chiếu 1'];
    const room = formatRooms[index % formatRooms.length];
    return {
      id: `st-${movieId}-${numDate}-${index}`,
      movieId,
      dateId,
      time: item.time,
      format: item.format,
      room,
      priceConfig: {
        STANDARD: 85000,
        VIP: 115000,
        COUPLE: 220000
      }
    };
  });
};

// Generate Seats for a specific showtime
// Deterministic layout with standard, VIP, Double and sold seats
export const getSeatsForShowtime = (showtimeId) => {
  // Layout: 8 rows (A to H), 12 columns (1 to 12)
  // Rows A-C: Standard (85k)
  // Rows D-F: VIP (115k)
  // Rows G-H: Sweetbox / Double (220k per seat - counts as double)
  // Double seats are placed in pairs (e.g. G1-G2 is a double seat, H11-H12 is a double seat)
  // To make it easy to code, we represent G and H as double seats where adjacent columns are paired.
  
  const rows = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
  const cols = 12;
  const seats = [];

  // Use hash of showtimeId to create stable sold seats
  let hash = 0;
  for (let i = 0; i < showtimeId.length; i++) {
    hash = showtimeId.charCodeAt(i) + ((hash << 5) - hash);
  }

  rows.forEach((row) => {
    const isDouble = row === 'G' || row === 'H';
    const isVip = row === 'D' || row === 'E' || row === 'F';
    let type = 'STANDARD';
    let price = 85000;
    
    if (isDouble) {
      type = 'COUPLE';
      price = 220000;
    } else if (isVip) {
      type = 'VIP';
      price = 115000;
    }

    for (let col = 1; col <= cols; col++) {
      const seatId = `${row}${col}`;
      
      // Predictably mark some seats as sold based on simple arithmetic and hash
      const val = Math.abs(hash + row.charCodeAt(0) * col) % 100;
      const isSold = val < 25; // 25% seats are pre-sold
      
      seats.push({
        id: seatId,
        row,
        col,
        type,
        price,
        isSold
      });
    }
  });

  return seats;
};
