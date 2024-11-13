echo '{"quizzID": "1"}' | websocat ws://localhost:8080/quizz/organizer

echo '{"quizzID": "1", "type": "Player_ServerChecking"}' | websocat ws://localhost:8080/quizz

{"quizzID": "1"}

{"quizzID": "1", "type": "Player_ServerChecking", "playerID": "1"}

{"quizzID": "1", "type": "Player_ServerChecking", "playerID": "2"}

{"quizzID": "1", "type": "Player_ServerChecking", "playerID": "3"}



