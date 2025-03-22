import React, { useState, useRef, useEffect } from 'react';
import './App.css';

const categories = {
  "Watching movies": [
    "What makes watching movies enjoyable or special to you?",
    "Why do you think people like watching movies so much?",
    "Has your way of enjoying watching movies changed as you got older?",
    "What do you usually do when you are watching movies?"
  ],
  "Going to clubs or nightclubs": [
    "Tell me about a time when you really enjoyed going to clubs or nightclubs.",
    "What do you usually do when you are going to clubs or nightclubs?",
    "Has your way of enjoying going to clubs or nightclubs changed as you got older?",
    "Do you think going to clubs or nightclubs is more popular among young or older people? Why?"
  ],
  "Watching performances": [
    "What are the best or worst memories you have related to watching performances?",
    "Can you describe what it's like to do watching performances?",
    "Do you prefer watching performances alone or with others? Why?",
    "How would you introduce watching performances to someone who never tried it?"
  ],
  "Attending concerts": [
    "Tell me about a time when you really enjoyed attending concerts.",
    "How would you introduce attending concerts to someone who never tried it?",
    "What do you usually do when you are attending concerts?",
    "Can you compare attending concerts with another hobby you have?"
  ],
  "Visiting museums": [
    "Describe a memorable moment you had while visiting museums.",
    "Can you describe what it's like to do visiting museums?",
    "Why do you think people like visiting museums so much?",
    "Do you prefer visiting museums alone or with others? Why?"
  ],
  "Going to parks": [
    "What do you usually do when you are going to parks?",
    "Tell me about a time when you really enjoyed going to parks.",
    "How did you get started with going to parks?",
    "How has your habit of going to parks changed over time?"
  ],
  "Camping": [
    "How did you get started with camping?",
    "How would you introduce camping to someone who never tried it?",
    "Do you think camping is more popular among young or older people? Why?",
    "Describe a memorable moment you had while camping."
  ],
  "Going to the beach": [
    "What are the best or worst memories you have related to going to the beach?",
    "What do you usually do when you are going to the beach?",
    "Tell me about a time when you really enjoyed going to the beach.",
    "Can you describe what it's like to do going to the beach?"
  ],
  "Watching sports": [
    "Can you describe what it's like to do watching sports?",
    "Have your habits around watching sports changed over the years?",
    "Why do you think people like watching sports so much?",
    "What do you usually do when you are watching sports?"
  ],
  "Home improvement": [
    "Describe a memorable moment you had while home improvement.",
    "What makes home improvement enjoyable or special to you?",
    "Do you think home improvement is more popular among young or older people? Why?",
    "How would you introduce home improvement to someone who never tried it?"
  ],
  "Going to bars": [
    "What do you usually do when you are going to bars?",
    "Tell me about a time when you really enjoyed going to bars.",
    "What are the best or worst memories you have related to going to bars?",
    "Can you describe what it's like to do going to bars?"
  ],
  "Going to cafes": [
    "How did you get started with going to cafes?",
    "Can you compare going to cafes with another hobby you have?",
    "Has your way of enjoying going to cafes changed as you got older?",
    "What makes going to cafes enjoyable or special to you?"
  ],
  "Playing games": [
    "Can you describe what it's like to do playing games?",
    "Why do you think people like playing games so much?",
    "Do you prefer playing games alone or with others? Why?",
    "Describe a memorable moment you had while playing games."
  ],
  "Posting on social media": [
    "How has your habit of posting on social media changed over time?",
    "What do you usually do when you are posting on social media?",
    "Why do you think people like posting on social media so much?",
    "How did you get started with posting on social media?"
  ],
  "Texting with friends": [
    "Do you think texting with friends is more popular among young or older people? Why?",
    "How did you get started with texting with friends?",
    "What makes texting with friends enjoyable or special to you?",
    "Tell me about a time when you really enjoyed texting with friends."
  ],
  "Taking test prep classes": [
    "Can you describe what it's like to do taking test prep classes?",
    "Why do you think people take test prep classes?",
    "Describe a memorable moment you had while taking test prep classes.",
    "Do you prefer studying alone or with others in test prep classes?"
  ],
  "Following the news": [
    "How did you get started with following the news?",
    "Has your habit of following the news changed over time?",
    "Why do you think following the news is important?",
    "Do you prefer reading the news or watching it? Why?"
  ],
  "Driving for fun": [
    "Can you describe what it's like to do driving for fun?",
    "What do you usually do when you are driving for fun?",
    "How often do you enjoy driving for fun and why?",
    "Tell me about a time when you really enjoyed driving for fun."
  ],
  "Going to spas or massage shops": [
    "What makes going to spas or massage shops enjoyable or special to you?",
    "Do you prefer going to spas alone or with friends? Why?",
    "Tell me about a time when you really enjoyed going to a spa or massage shop.",
    "Why do you think people like going to spas or massage shops?"
  ],
  "Job hunting": [
    "Describe a memorable experience you had during job hunting.",
    "Has your job hunting process changed over the years?",
    "Can you compare job hunting now and in the past?",
    "What are some challenges of job hunting in your country?"
  ],
  "Volunteering": [
    "Why do you think people choose to volunteer?",
    "Tell me about a memorable volunteer experience.",
    "How does volunteering impact your community?",
    "Would you recommend volunteering to others? Why or why not?"
  ],
  "Shopping": [
    "What do you usually shop for and where?",
    "How has your shopping style changed over time?",
    "Do you prefer shopping online or in stores? Why?",
    "Tell me about a fun or unique shopping experience."
  ],
  "Watching TV": [
    "What kinds of shows do you usually watch on TV?",
    "Has your TV watching habit changed in recent years?",
    "Compare watching TV and watching online content. Which do you prefer?",
    "Do you usually watch TV alone or with family?"
  ],
  "Watching reality shows": [
    "Why do you think people enjoy reality shows?",
    "Describe a reality show you find interesting.",
    "How do reality shows differ from scripted dramas?",
    "Tell me about a moment from a reality show that surprised you."
  ],
  "Watching cooking shows": [
    "What kind of cooking shows do you enjoy and why?",
    "Have you ever tried a recipe from a cooking show?",
    "Do cooking shows influence your cooking habits?",
    "Compare cooking shows from different countries if you have seen any."
  ],
  "Reading to children": [
    "Why is reading to children important?",
    "How do you choose books to read to children?",
    "Describe a fun experience reading to a child.",
    "What are some benefits of reading aloud to kids?"
  ],
  "Listening to music": [
    "What kind of music do you enjoy listening to?",
    "Tell me about a memorable music-related experience.",
    "How does music affect your mood or energy?",
    "Do you prefer listening to music alone or with others?"
  ],
  "Playing musical instruments": [
    "Which instrument do you play and how did you learn it?",
    "Describe how you feel while playing an instrument.",
    "Has playing an instrument changed your life in any way?",
    "Would you recommend learning an instrument to others?"
  ],
  "Singing": [
    "Do you sing often? Where and when?",
    "How do you feel when you sing?",
    "Tell me about a fun or memorable singing experience.",
    "Why do you think singing is popular in many cultures?"
  ],
  "Dancing": [
    "What type of dancing do you enjoy?",
    "When did you start dancing?",
    "Describe how dancing makes you feel.",
    "Do you prefer dancing alone or in a group?"
  ],
  "Writing": [
    "What kind of things do you like to write?",
    "Why do you enjoy writing?",
    "Tell me about a time you wrote something meaningful.",
    "Do you write for yourself or others?"
  ],
  "Embroidery": [
    "How did you start doing embroidery?",
    "What do you enjoy about embroidery?",
    "Tell me about a project you made.",
    "Would you teach someone else how to embroider?"
  ],
  "Cooking": [
    "How would you introduce cooking to someone who never tried it?",
    "How did you get started with cooking?",
    "Can you describe what it's like to do cooking?",
    "Describe a memorable moment you had while cooking."
  ],
  "Raising pets": [
    "How often do you enjoy raising pets and why?",
    "Do you prefer raising pets alone or with others? Why?",
    "What do you usually do when you are raising pets?",
    "Describe a memorable moment you had while raising pets."
  ],
  "Taking photos": [
    "Why do you like taking photos?",
    "What kind of scenes do you like to photograph?",
    "Tell me about a meaningful photo you took.",
    "Do you edit your photos? Why or why not?"
  ],
  "Reading newspapers": [
    "Describe a memorable moment you had while reading newspapers.",
    "How did you get started with reading newspapers?",
    "Can you describe what it's like to do reading newspapers?",
    "Has your way of enjoying reading newspapers changed as you got older?"
  ],
  "Reading travel blogs": [
    "What kinds of travel blogs do you like to read?",
    "Tell me about a blog that inspired you.",
    "Do you prefer reading travel blogs or watching travel videos?",
    "Why do you think travel blogs are popular?"
  ],
  "Reading books": [
    "What do you usually do when you are reading books?",
    "Why do you think people like reading books so much?",
    "Do you think reading books is more popular among young or older people? Why?",
    "How did you get started with reading books?"
  ],
  "Playing basketball": [
    "Tell me about a time when you really enjoyed playing basketball.",
    "What do you usually do when you are playing basketball?",
    "Do you play basketball with friends or in a team?",
    "What makes basketball fun for you?"
  ],
  "Playing baseball or softball": [
    "Do you prefer baseball or softball? Why?",
    "Tell me about a fun or challenging game you played.",
    "How does playing this sport make you feel?",
    "Would you recommend it to others? Why or why not?"
  ],
  "Playing soccer": [
    "Tell me about a time when you really enjoyed playing soccer.",
    "How would you introduce playing soccer to someone who never tried it?",
    "Can you compare playing soccer with another hobby you have?",
    "What do you usually do when you are playing soccer?"
  ],
  "Playing American football": [
    "Why do people enjoy American football?",
    "Describe how it feels to play the game.",
    "Have you ever watched or played American football with friends?",
    "Would you like to try this sport in another country?"
  ],
  "Playing hockey": [
    "What do you like about playing hockey?",
    "Is hockey popular in your area? Why or why not?",
    "Describe a fun hockey match you were part of.",
    "How did you get started with hockey?"
  ],
  
  "Playing cricket": [
    "How did you get started with playing cricket?",
    "What makes cricket exciting for you?",
    "Do you play casually or competitively?",
    "Tell me about a match or moment you remember well."
  ],
  "Playing golf": [
    "Why do you enjoy playing golf?",
    "Describe a beautiful golf course you've been to.",
    "How did you first learn to play golf?",
    "Do you think golf is more about skill or relaxation?"
  ],
  "Playing volleyball": [
    "When do you usually play volleyball?",
    "Do you prefer indoor or beach volleyball? Why?",
    "Tell me about a fun match you played.",
    "How does volleyball help you stay active?"
  ],
  "Playing tennis": [
    "Do you play singles or doubles more often?",
    "How did you learn to play tennis?",
    "What do you enjoy about tennis?",
    "Describe your most exciting tennis game."
  ],
  "Playing badminton": [
    "Why is badminton popular in your country?",
    "Do you play badminton with friends or family?",
    "What do you like about badminton?",
    "Tell me about a funny moment while playing badminton."
  ],
  "Playing table tennis": [
    "How is table tennis different from regular tennis?",
    "When did you start playing table tennis?",
    "What makes it fun or challenging for you?",
    "Do you prefer playing at home or in clubs?"
  ],
  "Swimming": [
    "Has your way of enjoying swimming changed as you got older?",
    "What do you usually do when you are swimming?",
    "Can you compare swimming with another hobby you have?",
    "How did you get started with swimming?"
  ],
  "Cycling": [
    "Where do you usually go cycling?",
    "How do you feel when riding a bike?",
    "Describe your best memory while cycling.",
    "Why is cycling good for your health?"
  ],
  "Skiing or snowboarding": [
    "Which do you prefer: skiing or snowboarding? Why?",
    "Where was your first time skiing or snowboarding?",
    "Tell me about an exciting or scary moment on the slopes.",
    "How do you prepare before you go skiing?"
  ],
  "Ice skating": [
    "How did you learn to ice skate?",
    "What do you enjoy most about skating?",
    "Do you go to indoor or outdoor rinks?",
    "Tell me about a fall or funny moment while skating."
  ],
  "Jogging": [
    "When and where do you go jogging?",
    "How does jogging help your mind or body?",
    "Do you jog alone or with someone?",
    "Describe a great run you remember."
  ],
  "Walking": [
    "Why do you enjoy walking?",
    "Where is your favorite place to take a walk?",
    "How often do you go walking?",
    "Do you prefer walking in the city or nature?"
  ],
  "Doing yoga": [
    "How did you start doing yoga?",
    "Do you follow a routine or attend classes?",
    "What are the benefits of yoga for you?",
    "Describe how you feel after a yoga session."
  ],
  "Hiking": [
    "What kind of hiking trails do you like?",
    "Do you go hiking alone or in a group?",
    "Tell me about a beautiful place you've hiked.",
    "Why do you enjoy hiking?"
  ],
  "Fishing": [
    "What makes fishing relaxing or enjoyable?",
    "Where do you usually go fishing?",
    "Tell me about the biggest fish you caught.",
    "How did you learn to fish?"
  ],
  "Working out": [
    "What is your favorite type of workout?",
    "Where do you usually exercise?",
    "How do you feel after working out?",
    "Tell me about your fitness goals."
  ],
  "Doing Taekwondo": [
    "When did you start learning Taekwondo?",
    "What belt are you, and what was the hardest test?",
    "How does Taekwondo help your body and mind?",
    "Would you recommend Taekwondo to others?"
  ],
  "Taking fitness classes": [
    "What kind of fitness classes have you tried?",
    "Do you prefer group classes or solo workouts?",
    "Tell me about an intense or fun class you remember.",
    "Why do people join fitness classes?"
  ],
  "Not doing any exercise": [
    "Why don t you exercise regularly?",
    "What are some things that stop you from exercising?",
    "Have you ever tried a sport or fitness activity?",
    "Do you want to become more active in the future?"
  ],
  "Business trip in Korea": [
    "Tell me about a recent business trip in Korea.",
    "How do business trips in Korea usually go?",
    "Do you like or dislike business trips? Why?",
    "How do you prepare for domestic business travel?"
  ],
  "Business trip abroad": [
    "What was your most memorable overseas business trip?",
    "What challenges did you face while traveling abroad for work?",
    "How do you stay productive on long business trips?",
    "Compare business trips abroad and at home."
  ],
  "Staycation": [
    "What do you like to do during a staycation?",
    "Why do some people prefer staying home for vacation?",
    "Tell me about a fun or relaxing staycation you had.",
    "How do you make a staycation feel special?"
  ],
  "Traveling in Korea": [
    "Where is your favorite travel destination in Korea?",
    "Tell me about a recent domestic trip.",
    "Do you travel with family or friends more?",
    "How has local travel changed over time?"
  ],
  "Traveling abroad": [
    "Do you prefer traveling abroad alone or with others? Why?",
    "Has your way of enjoying traveling abroad changed as you got older?",
    "How did you get started with traveling abroad?",
    "What are the best or worst memories you have related to traveling abroad?"
  ],
  "Watching YouTube": [
    "What kinds of content do you enjoy watching on YouTube and why?",
    "How did you start using YouTube and how often do you use it?",
    "Describe a memorable video or channel that had an impact on you.",
    "Compare watching YouTube to watching TV. Which do you prefer and why?"
  ],
  "Playing Minecraft": [
    "Can you describe what it is like to play Minecraft?",
    "Tell me about a fun or creative experience you had while playing Minecraft.",
    "Why do you think Minecraft is so popular among different age groups?",
    "How is Minecraft different from other video games you have played?"
  ],
  "Creating AI Art": [
    "What tools or platforms do you use to create AI art?",
    "How do you feel when you see your finished AI-generated art?",
    "Tell me about your first experience creating AI art.",
    "Do you think AI art is more about creativity or technology? Why?"
  ]
};


const App = () => {
  const [selectedCategory, setSelectedCategory] = useState('');
  const [answeredCategories, setAnsweredCategories] = useState(new Set());
  const [question, setQuestion] = useState('');
  const [questionUtterance, setQuestionUtterance] = useState(null);
  const [questionPlaybackRate, setQuestionPlaybackRate] = useState(1.0);
  const [translatedQuestion, setTranslatedQuestion] = useState('');
  const [audioUrl, setAudioUrl] = useState('');
  const [audioBlob, setAudioBlob] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [apiKey, setApiKey] = useState(localStorage.getItem('openai_api_key') || '');
  const [transcript, setTranscript] = useState('');
  const recognitionRef = useRef(null);
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const [practiceHistory, setPracticeHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [currentCategoryPage, setCurrentCategoryPage] = useState(0);
  const [kakaoId, setKakaoId] = useState('');
  const [showKakaoModal, setShowKakaoModal] = useState(false);
  const [selectedHistoryItem, setSelectedHistoryItem] = useState(null);
  const categoriesPerPage = 20;

  // 질문 선택 및 음성 출력
  const selectQuestion = () => {
    if (selectedCategory && categories[selectedCategory]) {
      // 이전 답변 및 녹음 내용 초기화
      setAudioUrl('');
      setAudioBlob(null);
      setTranscript('');
      setFeedback('');
     
      // 새 질문 설정
      const randomIndex = Math.floor(Math.random() * categories[selectedCategory].length);
      const selectedQuestion = categories[selectedCategory][randomIndex];
      setQuestion(selectedQuestion);
      setTranslatedQuestion('');
      speakQuestion(selectedQuestion);
     
      // 응답한 카테고리 목록에 추가
      setAnsweredCategories(prev => new Set(prev).add(selectedCategory));
    }
  };

  // 질문 음성 출력 - 속도 제어 기능 개선
  const speakQuestion = (text) => {
    // 기존 발화 중지
    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
    }
   
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    utterance.rate = questionPlaybackRate;
    setQuestionUtterance(utterance);
    window.speechSynthesis.speak(utterance);
  };

  // 질문 재생 속도 변경시 다시 재생
  useEffect(() => {
    if (questionUtterance && question) {
      if (window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
      }
      const newUtterance = new SpeechSynthesisUtterance(question);
      newUtterance.lang = "en-US";
      newUtterance.rate = questionPlaybackRate;
      setQuestionUtterance(newUtterance);
      window.speechSynthesis.speak(newUtterance);
    }
  }, [questionPlaybackRate]);

  // 질문 음성 정지
  const stopQuestion = () => {
    window.speechSynthesis.cancel();
  };

  // 녹음 시작 + 자막 즉시 출력
  const startRecording = async () => {
    try {
      setAudioUrl('');
      setAudioBlob(null);
      setTranscript('');
      setFeedback('');
     
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioBlob(audioBlob);
        const audioUrl = URL.createObjectURL(audioBlob);
        setAudioUrl(audioUrl);
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);

      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.lang = 'en-US';
        recognition.interimResults = true;
        recognition.continuous = true;

        recognition.onresult = (event) => {
          let transcript = Array.from(event.results).map(result => result[0].transcript).join('');
          setTranscript(transcript);
        };

        recognitionRef.current = recognition;
        recognition.start();
      }
    } catch (err) {
      console.error("Recording error:", err);
    }
  };

  // 녹음 종료
  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);

      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
     
      if (mediaRecorderRef.current.stream) {
        mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      }
    }
  };

  // API 키 저장
  const handleApiKeySubmit = () => {
    localStorage.setItem('openai_api_key', apiKey);
    alert('API 키가 저장되었습니다!');
  };

  // OpenAI API 호출 (피드백 요청)
  const fetchFeedback = async () => {
    if (!apiKey) {
      alert('API 키를 입력하고 저장하세요.');
      return;
    }

    if (!transcript) {
      alert('음성이 인식되지 않았습니다. 다시 녹음해주세요.');
      return;
    }
   
    setFeedback("피드백을 요청하는 중입니다...");
   
    let retries = 0;
    const maxRetries = 3;
   
    while (retries < maxRetries) {
      try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: 'gpt-3.5-turbo',
            messages: [
              {
                role: 'user',
                content: `Question: ${question}\n\nAnswer: ${transcript}\n\nPlease evaluate this OPIC answer and provide feedback on: 1) Pronunciation, 2) Grammar, 3) Vocabulary, 4) Fluency, and 5) Overall impression. Rate each category from 1-5.`
              }
            ],
          }),
        });

        if (response.status === 429) {
          retries++;
          const waitTime = Math.pow(2, retries) * 1000;
          setFeedback(`API 요청 제한에 걸렸습니다. ${waitTime/1000}초 후 다시 시도합니다...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
          continue;
        }

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        const newFeedback = data.choices?.[0]?.message?.content || '응답을 가져올 수 없습니다.';
        setFeedback(newFeedback);

        const practiceItem = {
          id: Date.now(),
          category: selectedCategory,
          question: question,
          answer: transcript,
          feedback: newFeedback,
          audioBlob: audioBlob,
          date: new Date().toLocaleString()
        };
       
        setPracticeHistory(prevHistory => [...prevHistory, practiceItem]);
        break;
       
      } catch (error) {
        retries++;
        if (retries >= maxRetries) {
          console.error('피드백 요청 오류:', error);
          setFeedback('오류가 발생했습니다: ' + error.message);
          break;
        }
       
        const waitTime = Math.pow(2, retries) * 1000;
        setFeedback(`오류가 발생했습니다. ${waitTime/1000}초 후 다시 시도합니다...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
  };

  // 질문 번역 기능 (무료 API 사용)
  const translateQuestion = async () => {
    if (!question) return;
   
    try {
      // MyMemory API (무료)
      const myMemoryUrl = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(question)}&langpair=en|ko`;
      const myMemoryResponse = await fetch(myMemoryUrl);
     
      if (myMemoryResponse.ok) {
        const data = await myMemoryResponse.json();
        if (data.responseData) {
          setTranslatedQuestion(data.responseData.translatedText);
          return;
        }
      }
     
      setTranslatedQuestion("번역 서비스를 이용할 수 없습니다. 나중에 다시 시도해주세요.");
     
    } catch (error) {
      console.error('Translation error:', error);
      setTranslatedQuestion("번역을 가져오지 못했습니다. 나중에 다시 시도해주세요.");
    }
  };

  // 히스토리를 HTML/PPT 형식으로 내보내기
  const exportToPPT = () => {
    if (practiceHistory.length === 0) {
      alert('내보낼 연습 기록이 없습니다.');
      return;
    }

    let pptHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>OPIC 연습 기록</title>
      <style>
        body { font-family: Arial, sans-serif; }
        .slide { page-break-after: always; padding: 20px; border: 1px solid #ddd; margin-bottom: 20px; }
        h1 { color: #2c3e50; }
        h2 { color: #3498db; }
        .question { background-color: #f8f9fa; padding: 10px; border-left: 5px solid #3498db; }
        .answer { background-color: #f1f8e9; padding: 10px; border-left: 5px solid #4caf50; }
        .feedback { background-color: #fff8e1; padding: 10px; border-left: 5px solid #ffc107; }
        .date { color: #7f8c8d; font-size: 0.8em; }
      </style>
    </head>
    <body>
      <h1>OPIC 연습 기록</h1>
    `;

    practiceHistory.forEach((item, index) => {
      pptHtml += `
      <div class="slide">
        <h2>연습 #${index + 1} - ${item.category}</h2>
        <p class="date">날짜: ${item.date}</p>
        <div class="question">
          <h3>질문:</h3>
          <p>${item.question}</p>
        </div>
        <div class="answer">
          <h3>응답:</h3>
          <p>${item.answer}</p>
        </div>
        <div class="feedback">
          <h3>피드백:</h3>
          <p>${item.feedback}</p>
        </div>
      </div>
      `;
    });

    pptHtml += `
    </body>
    </html>
    `;

    const blob = new Blob([pptHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'OPIC_연습_기록.html';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
 
  // 카테고리 페이징 관련 함수들
  const getCurrentPageCategories = () => {
    const allCategories = Object.keys(categories);
    const startIndex = currentCategoryPage * categoriesPerPage;
    return allCategories.slice(startIndex, startIndex + categoriesPerPage);
  };

  const nextCategoryPage = () => {
    const totalPages = Math.ceil(Object.keys(categories).length / categoriesPerPage);
    if (currentCategoryPage < totalPages - 1) {
      setCurrentCategoryPage(currentCategoryPage + 1);
    }
  };

  const prevCategoryPage = () => {
    if (currentCategoryPage > 0) {
      setCurrentCategoryPage(currentCategoryPage - 1);
    }
  };

  const totalCategoryPages = Math.ceil(Object.keys(categories).length / categoriesPerPage);

  // 카카오톡으로 공유
  const openKakaoModal = (item) => {
    setSelectedHistoryItem(item);
    setShowKakaoModal(true);
  };

  const sendToKakao = async () => {
    if (!kakaoId || !selectedHistoryItem) {
      alert('카카오톡 ID를 입력하세요.');
      return;
    }

    // 실제 구현에서는 서버에 전송하거나 카카오 API 사용
    alert(`${kakaoId}님에게 연습 결과를 전송했습니다!`);
    setShowKakaoModal(false);
    setKakaoId('');
    setSelectedHistoryItem(null);
  };

  return (
    <div className="app-container">
      <h1>🎙️ OPIC Practice Program (Global Production Engineering Team)</h1>

      <div className="api-key-section">
        <input
          type="text"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder="OpenAI API Key 입력"
        />
        <button onClick={handleApiKeySubmit}>API 키 저장</button>
      </div>

      <div className="tab-menu">
        <button
          className={!showHistory ? "active-tab" : ""}
          onClick={() => setShowHistory(false)}
        >
          연습 모드
        </button>
        <button
          className={showHistory ? "active-tab" : ""}
          onClick={() => setShowHistory(true)}
        >
          연습 기록 ({practiceHistory.length})
        </button>
      </div>

      {!showHistory ? (
        <>
          <div className="category-section">
            <div className="category-navigation">
              <button
                onClick={prevCategoryPage}
                className="arrow-button left"
                disabled={currentCategoryPage === 0}
              >
                ◀
              </button>
             
              <div className="category-grid">
                {getCurrentPageCategories().map((category) => (
                  <button
                    key={category}
                    onClick={() => setSelectedCategory(category)}
                    className={`category-button ${selectedCategory === category ? "selected" : ""}`}
                    disabled={answeredCategories.has(category)}
                  >
                    {category}
                  </button>
                ))}
              </div>
             
              <button
                onClick={nextCategoryPage}
                className="arrow-button right"
                disabled={currentCategoryPage >= totalCategoryPages - 1}
              >
                ▶
              </button>
            </div>
           
            <div className="page-indicator">
              페이지 {currentCategoryPage + 1}/{totalCategoryPages}
            </div>
          </div>

          <div className="question-section">
            <button onClick={selectQuestion} className="control-button">▶️ Start Question</button>
            <button onClick={() => speakQuestion(question)} className="control-button">🔁 Replay</button>
            <button onClick={stopQuestion} className="control-button">⏹️ Stop</button>
            <button onClick={isRecording ? stopRecording : startRecording} className="control-button">
              {isRecording ? '⏹️ Stop Recording' : '🎙️ Start Recording'}
            </button>
            {question && (
              <button onClick={translateQuestion} className="control-button">
                🌐 Translate
              </button>
            )}
            {transcript && !isRecording && (
              <button
                onClick={fetchFeedback}
                disabled={!apiKey}
                className="feedback-button"
              >
                Request Feedback
              </button>
            )}
          </div>

          {question && (
            <div className="question-box">
              <div className="question-header">
                <h3>💬 Question:</h3>
                {/* 질문 속도 조절 컨트롤을 여기로 이동 */}
                <div className="question-speed-control">
                  <span>속도: </span>
                  <button
                    onClick={() => setQuestionPlaybackRate(0.8)}
                    className={questionPlaybackRate === 0.8 ? "active" : ""}
                  >
                    0.8x
                  </button>
                  <button
                    onClick={() => setQuestionPlaybackRate(1.0)}
                    className={questionPlaybackRate === 1.0 ? "active" : ""}
                  >
                    1.0x
                  </button>
                  <button
                    onClick={() => setQuestionPlaybackRate(1.2)}
                    className={questionPlaybackRate === 1.2 ? "active" : ""}
                  >
                    1.2x
                  </button>
                </div>
              </div>
              <p>{question}</p>
              {translatedQuestion && (
                <div className="translation">
                  <h4>🌐 한국어 번역:</h4>
                  <p>{translatedQuestion}</p>
                </div>
              )}
            </div>
          )}

          {transcript && (
            <div className="transcript-section">
              <div className="answer-header">
                <h3>🔊 Your Answer:</h3>
                {audioUrl && (
                  <audio controls src={audioUrl} className="inline-audio"></audio>
                )}
              </div>
              <p>{transcript}</p>
            </div>
          )}    

          {feedback && (
            <div className="feedback-section">
              <h3>📝 Feedback:</h3>
              <div className="feedback-content">
                <p>{feedback}</p>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="history-container">
          <div className="history-controls">
            <button onClick={exportToPPT} className="export-button">
              📥 연습 기록 내보내기 (HTML/PPT)
            </button>
            <button onClick={() => setPracticeHistory([])} className="clear-button">
              🗑️ 기록 지우기
            </button>
          </div>
         
          {practiceHistory.length === 0 ? (
            <p className="no-history">아직 저장된 연습 기록이 없습니다.</p>
          ) : (
            <div className="history-list">
              {practiceHistory.map((item, index) => (
                <div key={item.id} className="history-item">
                  <div className="history-header">
                    <h3>연습 #{index + 1} - {item.category}</h3>
                    <button
                      onClick={() => openKakaoModal(item)}
                      className="share-button"
                    >
                      카카오톡으로 공유
                    </button>
                  </div>
                  <p className="history-date">{item.date}</p>
                 
                  <div className="history-question">
                    <h4>Question:</h4>
                    <p>{item.question}</p>
                  </div>
                 
                  <div className="history-answer">
                    <h4>Answer:</h4>
                    <p>{item.answer}</p>
                    {item.audioBlob && (
                      <audio controls src={URL.createObjectURL(item.audioBlob)}></audio>
                    )}
                  </div>
                 
                  <div className="history-feedback">
                    <h4>Feedback:</h4>
                    <p>{item.feedback}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 카카오톡 ID 입력 모달 */}
      {showKakaoModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>카카오톡으로 공유</h3>
            <p>받는 사람의 카카오톡 ID를 입력하세요:</p>
            <input
              type="text"
              value={kakaoId}
              onChange={(e) => setKakaoId(e.target.value)}
              placeholder="카카오톡 ID"
            />
            <div className="modal-buttons">
              <button onClick={sendToKakao}>전송</button>
              <button onClick={() => setShowKakaoModal(false)}>취소</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;