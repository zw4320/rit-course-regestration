// Global state
let coursesData = [];
let mySchedule = [];
let selectedCourse = null;
let currentFilter = 'all';

// Initialize the app when the page loads
document.addEventListener('DOMContentLoaded', async () => {
    await loadCourses();
    renderFilterButtons();
    renderCourses();
    renderSchedule();
});

// Load courses from JSON file
async function loadCourses() {
    try {
        const response = await fetch('rit_courses.json');
        const data = await response.json();
        coursesData = data.courses;
    } catch (error) {
        console.error('Error loading courses:', error);
        coursesData = [];
    }
}

// Get unique departments from courses
function getDepartments() {
    const departments = [...new Set(coursesData.map(course => course.department))];
    return departments.sort();
}

// Render filter buttons
function renderFilterButtons() {
    const filterContainer = document.getElementById('filterButtons');
    const departments = getDepartments();
    
    // Add "All Courses" button
    const allBtn = createFilterButton('All Courses', 'all', true);
    filterContainer.appendChild(allBtn);
    
    // Add department buttons
    departments.forEach(dept => {
        const btn = createFilterButton(dept, dept, false);
        filterContainer.appendChild(btn);
    });
}

// Create a single filter button
function createFilterButton(label, value, isActive) {
    const btn = document.createElement('button');
    btn.className = 'filter-btn' + (isActive ? ' active' : '');
    btn.textContent = label;
    btn.addEventListener('click', () => filterCourses(value, btn));
    return btn;
}

// Filter courses by department
function filterCourses(department, clickedBtn) {
    currentFilter = department;
    
    // Update active state
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    clickedBtn.classList.add('active');
    
    // Hide course details when filtering
    hideCourseDetails();
    
    // Re-render courses
    renderCourses();
}

// Render course list
function renderCourses() {
    const courseGrid = document.getElementById('courseGrid');
    courseGrid.innerHTML = '';
    
    const filteredCourses = currentFilter === 'all' 
        ? coursesData 
        : coursesData.filter(course => course.department === currentFilter);
    
    if (filteredCourses.length === 0) {
        courseGrid.innerHTML = '<p style="color: #666; text-align: center; padding: 40px;">No courses found.</p>';
        return;
    }
    
    filteredCourses.forEach(course => {
        const card = createCourseCard(course);
        courseGrid.appendChild(card);
    });
}

// Create a single course card
function createCourseCard(course) {
    const card = document.createElement('div');
    card.className = 'course-card';
    
    if (selectedCourse && selectedCourse.id === course.id) {
        card.classList.add('selected');
    }
    
    // Check if prerequisites are met
    const prerequisitesMet = checkPrerequisites(course);
    const isLocked = !prerequisitesMet.met && course.prerequisites.length > 0;
    
    // Add locked styling if prerequisites not met
    if (isLocked) {
        card.style.opacity = '0.6';
        card.style.borderColor = '#666';
    }
    
    const lockIcon = isLocked ? ' 🔒' : '';
    
    card.innerHTML = `
        <div class="course-header">
            <div class="course-code">${course.courseCode}${lockIcon}</div>
            <div class="course-credits">${course.credits} CR</div>
        </div>
        <div class="course-title">${course.title}</div>
        <div class="course-department">${course.department}</div>
    `;
    
    card.addEventListener('click', () => showCourseDetails(course, card));
    
    return card;
}

// Show course details
function showCourseDetails(course, cardElement) {
    selectedCourse = course;
    
    // Update selected state on cards
    document.querySelectorAll('.course-card').forEach(card => {
        card.classList.remove('selected');
    });
    cardElement.classList.add('selected');
    
    // Populate details
    document.getElementById('detailsCode').textContent = course.courseCode;
    document.getElementById('detailsTitle').textContent = course.title;
    document.getElementById('detailsDepartment').textContent = course.department;
    document.getElementById('detailsCredits').textContent = `${course.credits} Credits`;
    document.getElementById('detailsDescription').textContent = course.description;
    
    // Prerequisites
    const prereqContainer = document.getElementById('detailsPrerequisites');
    prereqContainer.innerHTML = '';
    if (course.prerequisites.length === 0) {
        prereqContainer.innerHTML = '<span style="color: #666;">None</span>';
    } else {
        const scheduledCourseCodes = mySchedule.map(c => c.courseCode);
        course.prerequisites.forEach(prereq => {
            const tag = document.createElement('span');
            const isCompleted = scheduledCourseCodes.includes(prereq);
            tag.className = 'prerequisite-tag';
            
            if (isCompleted) {
                tag.style.background = '#2d6b2d';
                tag.style.borderColor = '#4CAF50';
                tag.style.color = '#4CAF50';
                tag.textContent = prereq + ' ✓';
            } else {
                tag.style.background = '#2d2d2d';
                tag.style.borderColor = '#ff4444';
                tag.style.color = '#ff4444';
                tag.textContent = prereq + ' ✗';
            }
            
            prereqContainer.appendChild(tag);
        });
    }
    
    // Terms
    const termsContainer = document.getElementById('detailsTerms');
    termsContainer.innerHTML = '';
    course.terms.forEach(term => {
        const tag = document.createElement('span');
        tag.className = 'term-tag';
        tag.textContent = term;
        termsContainer.appendChild(tag);
    });
    
    // Update Add to Schedule button
    const addBtn = document.getElementById('addScheduleBtn');
    const isAlreadyInSchedule = mySchedule.some(c => c.id === course.id);
    const prerequisitesMet = checkPrerequisites(course);
    
    if (isAlreadyInSchedule) {
        addBtn.textContent = 'Already in Schedule';
        addBtn.disabled = true;
    } else if (!prerequisitesMet.met) {
        addBtn.textContent = `Missing Prerequisites: ${prerequisitesMet.missing.join(', ')}`;
        addBtn.disabled = true;
        addBtn.style.background = '#666';
        addBtn.style.cursor = 'not-allowed';
    } else {
        addBtn.textContent = 'Add to My Schedule';
        addBtn.disabled = false;
        addBtn.style.background = '#F76902';
        addBtn.style.cursor = 'pointer';
        addBtn.onclick = () => addToSchedule(course);
    }
    
    // Show details panel
    document.getElementById('courseDetails').classList.add('show');
    
    // Scroll to details (smooth scroll)
    document.getElementById('courseDetails').scrollIntoView({ 
        behavior: 'smooth', 
        block: 'nearest' 
    });
}

// Hide course details
function hideCourseDetails() {
    document.getElementById('courseDetails').classList.remove('show');
    selectedCourse = null;
    document.querySelectorAll('.course-card').forEach(card => {
        card.classList.remove('selected');
    });
}

// Check if prerequisites are met
function checkPrerequisites(course) {
    // If no prerequisites, course can be taken
    if (course.prerequisites.length === 0) {
        return { met: true, missing: [] };
    }
    
    // Get list of course codes in the student's schedule
    const scheduledCourseCodes = mySchedule.map(c => c.courseCode);
    
    // Find which prerequisites are missing
    const missingPrerequisites = course.prerequisites.filter(
        prereq => !scheduledCourseCodes.includes(prereq)
    );
    
    return {
        met: missingPrerequisites.length === 0,
        missing: missingPrerequisites
    };
}

// Add course to schedule
function addToSchedule(course) {
    // Check if already in schedule
    if (mySchedule.some(c => c.id === course.id)) {
        return;
    }
    
    mySchedule.push(course);
    renderSchedule();
    renderCourses(); // Re-render courses to update lock status for other courses
    
    // Update the button state
    const addBtn = document.getElementById('addScheduleBtn');
    addBtn.textContent = 'Already in Schedule';
    addBtn.disabled = true;
}

// Remove course from schedule
function removeFromSchedule(courseId) {
    mySchedule = mySchedule.filter(c => c.id !== courseId);
    renderSchedule();
    renderCourses(); // Re-render courses to update lock status
    
    // Update button if this course is currently selected
    if (selectedCourse && selectedCourse.id === courseId) {
        const addBtn = document.getElementById('addScheduleBtn');
        addBtn.textContent = 'Add to My Schedule';
        addBtn.disabled = false;
        addBtn.style.background = '#F76902';
        addBtn.style.cursor = 'pointer';
    }
    
    // If the currently selected course is showing, refresh its details to update prerequisite status
    if (selectedCourse) {
        const currentCard = document.querySelector('.course-card.selected');
        if (currentCard) {
            showCourseDetails(selectedCourse, currentCard);
        }
    }
}

// Render schedule
function renderSchedule() {
    const scheduleList = document.getElementById('scheduleList');
    const totalCreditsSection = document.getElementById('totalCreditsSection');
    const totalCreditsValue = document.getElementById('totalCredits');
    
    // Clear schedule list
    scheduleList.innerHTML = '';
    
    if (mySchedule.length === 0) {
        scheduleList.innerHTML = `
            <div class="empty-schedule">
                <div class="empty-schedule-icon">📚</div>
                <p>No courses added yet.<br>Click on a course to get started!</p>
            </div>
        `;
        totalCreditsSection.style.display = 'none';
        return;
    }
    
    // Show schedule items
    mySchedule.forEach(course => {
        const item = createScheduleItem(course);
        scheduleList.appendChild(item);
    });
    
    // Calculate and show total credits
    const totalCredits = mySchedule.reduce((sum, course) => sum + course.credits, 0);
    totalCreditsValue.textContent = totalCredits;
    totalCreditsSection.style.display = 'block';
}

// Create schedule item
function createScheduleItem(course) {
    const item = document.createElement('div');
    item.className = 'schedule-item';
    
    item.innerHTML = `
        <div class="schedule-item-header">
            <div class="schedule-code">${course.courseCode}</div>
            <div class="schedule-credits">${course.credits} CR</div>
        </div>
        <div class="schedule-title">${course.title}</div>
        <button class="remove-btn" onclick="removeFromSchedule('${course.id}')">Remove</button>
    `;
    
    return item;
}

// Export functions to global scope for inline event handlers
window.removeFromSchedule = removeFromSchedule;