// 테스트용 목 데이터

export const mockTeacher = {
  id: '00000000-0000-0000-0000-000000000001',
  name: '김선생',
  email: 'teacher@todo.com',
  password: 'password123'
}

export const mockStudents = [
  {
    id: '10000000-0000-0000-0000-000000000001',
    name: '김철수',
    email: 'student1@test.com',
    accessToken: 'student-uuid-token-1',
    dailyGoal: 10,
    progress: 35,
    completedToday: 5
  },
  {
    id: '10000000-0000-0000-0000-000000000002',
    name: '이영희',
    email: 'student2@test.com',
    accessToken: 'student-uuid-token-2',
    dailyGoal: 10,
    progress: 68,
    completedToday: 10
  },
  {
    id: '10000000-0000-0000-0000-000000000003',
    name: '박지민',
    email: 'student3@test.com',
    accessToken: 'student-uuid-token-3',
    dailyGoal: 10,
    progress: 22,
    completedToday: 3
  }
]

export const mockWordlists = [
  {
    id: 1,
    title: '기초 영단어 100',
    totalWords: 100,
    assignedStudents: 3
  },
  {
    id: 2,
    title: '중급 영단어 200',
    totalWords: 200,
    assignedStudents: 2
  },
  {
    id: 3,
    title: '고급 영단어 300',
    totalWords: 300,
    assignedStudents: 1
  }
]

export const mockWords = [
  { id: 1, word_text: 'apple', meaning: '사과', example: 'I eat an apple.', example_translation: '나는 사과를 먹는다.', mnemonic: null },
  { id: 2, word_text: 'book', meaning: '책', example: 'This is a good book.', example_translation: '이것은 좋은 책이다.', mnemonic: null },
  { id: 3, word_text: 'computer', meaning: '컴퓨터', example: 'I use a computer.', example_translation: '나는 컴퓨터를 사용한다.', mnemonic: null },
  { id: 4, word_text: 'dog', meaning: '개', example: 'I have a dog.', example_translation: '나는 개를 키운다.', mnemonic: null },
  { id: 5, word_text: 'eat', meaning: '먹다', example: 'I eat breakfast.', example_translation: '나는 아침을 먹는다.', mnemonic: null },
  { id: 6, word_text: 'friend', meaning: '친구', example: 'He is my friend.', example_translation: '그는 내 친구다.', mnemonic: null },
  { id: 7, word_text: 'good', meaning: '좋은', example: 'That is good.', example_translation: '그것은 좋다.', mnemonic: null },
  { id: 8, word_text: 'happy', meaning: '행복한', example: 'I am happy.', example_translation: '나는 행복하다.', mnemonic: null },
  { id: 9, word_text: 'interesting', meaning: '흥미로운', example: 'This is interesting.', example_translation: '이것은 흥미롭다.', mnemonic: null },
  { id: 10, word_text: 'jump', meaning: '뛰다', example: 'I can jump high.', example_translation: '나는 높이 뛸 수 있다.', mnemonic: null },
  { id: 11, word_text: 'knowledge', meaning: '지식', example: 'Knowledge is power.', example_translation: '아는 것이 힘이다.', mnemonic: 'know(알다) + ledge(끝)' },
  { id: 12, word_text: 'love', meaning: '사랑', example: 'I love you.', example_translation: '나는 너를 사랑한다.', mnemonic: null },
  { id: 13, word_text: 'morning', meaning: '아침', example: 'Good morning!', example_translation: '좋은 아침!', mnemonic: null },
  { id: 14, word_text: 'night', meaning: '밤', example: 'Good night!', example_translation: '잘 자!', mnemonic: null },
  { id: 15, word_text: 'open', meaning: '열다', example: 'Open the door.', example_translation: '문을 열어라.', mnemonic: null }
]

export const mockStudentProgress = {
  'student-uuid-token-1': {
    currentWordIndex: 0,
    completedWords: [
      { id: 1, word_text: 'apple', meaning: '사과' },
      { id: 2, word_text: 'book', meaning: '책' },
      { id: 3, word_text: 'computer', meaning: '컴퓨터' },
      { id: 5, word_text: 'eat', meaning: '먹다' },
      { id: 7, word_text: 'good', meaning: '좋은' }
    ],
    todayCompleted: 5,
    totalWords: 15,
    dailyGoal: 10
  }
}

