import React, { useState } from 'react';
import axios from 'axios';

function CourseSearch({ onSelectCourse }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);

  const handleSearch = async () => {
    try {
      // Call your backend route: /api/search-courses?name=searchTerm
      const response = await axios.get('/api/search-courses', {
        params: { name: searchTerm }
      });

      // Assuming response.data is an array of course objects
      console.log('Search response:', response.data);
      setSearchResults(response.data);
    } catch (err) {
      console.error('Error searching for courses:', err);
      setSearchResults([]);
    }
  };

  const handleSelectCourse = (course) => {
    // Let the parent know which course was selected
    onSelectCourse(course);
  };

  return (
    <div style={{ marginBottom: '1rem' }}>
      <h3>Search for a Course</h3>
      <input
        type="text"
        placeholder="e.g. Twin Oaks"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        style={{ marginRight: '0.5rem' }}
      />
      <button onClick={handleSearch}>Search</button>

      {/* Render results */}
      {searchResults.length > 0 ? (
        <ul style={{ marginTop: '1rem' }}>
          {searchResults.map((course) => (
            <li key={course._id} style={{ marginBottom: '0.5rem' }}>
              <strong>{course.name}</strong>
              {' – '}
              {course.city}, {course.state}
              <br />
              <button onClick={() => handleSelectCourse(course)}>
                Select This Course
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p style={{ marginTop: '1rem' }}>No courses yet. Try searching!</p>
      )}
    </div>
  );
}

export default CourseSearch;
