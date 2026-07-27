import api from './api';

const unwrap = (response) =>
  response?.data?.data !== undefined ? response.data.data : response?.data;

export const theaterService = {
  list: () => api.get('/api/theaters').then(unwrap),

  getById: (theaterId) => api.get(`/api/theaters/${theaterId}`).then(unwrap),

  listWithRooms: async () => {
    const response = await theaterService.list();
    const theaters = Array.isArray(response) ? response : [];

    return Promise.all(
      theaters.map(async (theater) => {
        try {
          const detail = await theaterService.getById(theater.id);
          return {
            ...theater,
            ...detail,
            cinemaRooms: Array.isArray(detail?.cinemaRooms) ? detail.cinemaRooms : [],
          };
        } catch {
          return { ...theater, cinemaRooms: [] };
        }
      }),
    );
  },
};

export default theaterService;
