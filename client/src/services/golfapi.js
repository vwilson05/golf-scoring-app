/***********************************
 * golfAPI.js
 ***********************************/
import axios from 'axios';

// For searching courses by name
export async function searchCourses(name) {
  const response = await axios.get('/api/search-courses', {
    params: { name }
  });
  return response.data;
}

// For fetching a single course’s data by ID
export async function fetchCourseData(id) {
  const response = await axios.get('/api/course-data', {
    params: { id }
  });
  return response.data;
}
