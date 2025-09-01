const openai = require('../config/openai');

// Generate practice sentence with OpenAI
async function generatePracticeSentence(word) {
  try {
    // Create prompt for OpenAI to generate practice sentence
    const practicePrompt = `
You are an expert English language teacher and creative writing specialist. Create a diverse, natural practice sentence that includes the word "${word}" to help students improve their pronunciation and speaking skills.

CREATIVITY REQUIREMENTS:
- Create a sentence that is DIFFERENT from typical practice sentences
- Use various sentence structures and contexts
- Make it engaging and memorable
- Include the word "${word}" naturally and meaningfully

SENTENCE VARIETY OPTIONS (choose one randomly):
1. QUESTION SENTENCE: Ask a question using the word
2. OPINION SENTENCE: Express a personal opinion or preference
3. STORY SENTENCE: Create a mini-story or scenario
4. COMPARISON SENTENCE: Compare something using the word
5. DESCRIPTIVE SENTENCE: Describe something in detail
6. ACTION SENTENCE: Describe an action or activity
7. EMOTIONAL SENTENCE: Express feelings or emotions
8. FUTURE SENTENCE: Talk about plans or predictions
9. PAST SENTENCE: Describe a past experience
10. CONDITIONAL SENTENCE: Use "if" or "when" structures

CONTEXT VARIETY:
- Daily life situations
- Work or school scenarios
- Travel and adventure
- Food and cooking
- Technology and gadgets
- Nature and environment
- Sports and hobbies
- Family and relationships
- Shopping and fashion
- Health and wellness

LANGUAGE LEVEL:
- Suitable for intermediate English learners
- Natural, conversational tone
- Clear pronunciation practice opportunities
- 1-2 sentences maximum
- Engaging and fun to say

EXAMPLES FOR DIFFERENT STYLES:
- Question: "Have you ever tried making ${word} at home?"
- Opinion: "I think ${word} is the most amazing thing I've discovered this year."
- Story: "Yesterday, I found the most incredible ${word} while exploring the local market."
- Comparison: "This ${word} tastes much better than the one I had last week."
- Descriptive: "The ${word} in this restaurant has the perfect balance of flavors."

Please provide only the sentence, no explanations or additional text. Make it creative and different from typical practice sentences!
`;

    try {
      const openAIResponse = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: "You are an expert English language teacher who creates natural practice sentences for pronunciation improvement."
          },
          {
            role: "user",
            content: practicePrompt
          }
        ],
        temperature: 0.9,
        max_tokens: 150
      });

      const sentence = openAIResponse.choices[0].message.content.trim();
      
      console.log('Generated practice sentence:', sentence);
      
      return {
        success: true,
        sentence: sentence,
        word: word,
        timestamp: new Date().toISOString()
      };

    } catch (openAIError) {
      console.error('OpenAI API error for practice sentence:', openAIError.message);
      
      // Fallback: create diverse practice sentences
      const fallbackSentences = [
        `Have you ever tried making ${word} at home?`,
        `I think ${word} is absolutely amazing!`,
        `Yesterday, I discovered the most incredible ${word}.`,
        `This ${word} tastes much better than the usual ones.`,
        `The ${word} in this place has the perfect flavor.`,
        `Would you like to learn how to make ${word}?`,
        `I can't believe how delicious this ${word} is!`,
        `Have you seen the new ${word} at the market?`,
        `This is the best ${word} I've ever tasted.`,
        `Let's practice saying "${word}" together.`
      ];
      
      const randomIndex = Math.floor(Math.random() * fallbackSentences.length);
      const fallbackSentence = fallbackSentences[randomIndex];
      
      return {
        success: true,
        sentence: fallbackSentence,
        word: word,
        fallback: true,
        timestamp: new Date().toISOString()
      };
    }

  } catch (error) {
    console.error('Error in practice sentence generation:', error);
    throw error;
  }
}

module.exports = {
  generatePracticeSentence
};
