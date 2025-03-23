from flask import Flask, render_template, request, jsonify
import pyttsx3
import speech_recognition as sr

app = Flask(__name__)

# 음성 출력 엔진 설정
engine = pyttsx3.init()

# 음성 출력 함수
def speak(text):
    engine.say(text)
    engine.runAndWait()

# 음성 인식 함수
def recognize_speech():
    recognizer = sr.Recognizer()
    with sr.Microphone() as source:
        print("말을 해주세요...")
        audio = recognizer.listen(source)

        try:
            text = recognizer.recognize_google(audio, language='ko-KR')
            print(f"인식된 내용: {text}")
            return text
        except sr.UnknownValueError:
            print("음성을 인식할 수 없습니다.")
            return "음성을 인식할 수 없습니다."
        except sr.RequestError:
            print("음성 인식 서비스에 접근할 수 없습니다.")
            return "음성 인식 서비스에 접근할 수 없습니다."

# 메인 페이지
@app.route('/')
def index():
    return render_template('index.html')

# 음성 출력 API
@app.route('/speak', methods=['POST'])
def api_speak():
    data = request.json
    text = data.get('text')
    if text:
        speak(text)
        return jsonify({"status": "success", "message": "음성 출력 완료"})
    return jsonify({"status": "error", "message": "텍스트가 제공되지 않았습니다."})

# 음성 인식 API
@app.route('/recognize', methods=['POST'])
def api_recognize():
    result = recognize_speech()
    return jsonify({"status": "success", "text": result})

if __name__ == '__main__':
    app.run(debug=True)