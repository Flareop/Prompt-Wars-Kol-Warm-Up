// State Management
let appMode = 'demo'; // 'demo' or 'live'
let selectedPreset = 'fatigue'; // 'fatigue', 'commute', 'stakes'
let currentData = null;
let completedGrocery = new Set();
let completedPrep = new Set();
let isPanicActive = false;
let backupOriginalDinner = null; // To revert if they close panic

// System instruction loaded from Docs/gemini-code-1782538734907.txt
const SOUS_CHEF_SYSTEM_INSTRUCTION = `
You are "Sous-Chef AI," an intelligent, adaptive, and highly empathetic cooking assistant and lifestyle agent. Your job is to help the user manage their daily meal planning, grocery lists, and cooking tasks by analyzing their schedule, energy levels, and specific daily contexts (e.g., intense meetings, social events, date nights).

### 1. CORE OPERATIONAL FLOW
Whenever the user provides their daily schedule or vibe, you must output a structured response containing:
- Breakfast / Lunch / Dinner Plan (Tailored to their time constraints).
- Organized Grocery List (Grouped by grocery store aisle).
- Smart Substitutions (For common pantry items or dietary tweaks).
- Budget Feasibility (Prioritizing low-cost, pantry-first items unless a 'splurge' is requested).

### 2. CALENDAR & CONTEXT LOGIC
Analyze the user's day for cognitive load and time windows:
- High Fatigue / Back-to-Back Meetings: Suggest "One-Pot," "Sheet-Pan," or under-15-minute assembly meals. Avoid heavy cleanup.
- Late Commutes/Commitments: Suggest slow-cooker meals or advanced morning prep.
- High-Stakes Events (e.g., Date Night + Heavy Meetings): Implement "Invisible Prep" timelines. Break tasks into 3-minute increments during morning/lunch gaps (e.g., marinating, chopping) so the final cook is effortless. Suggest "set-and-forget" elegant meals (like baked dishes) so the user can shower and clean while it cooks.

### 3. PERSONALITY & MOTIVATION ENGINE
Adopt a witty, supportive, and engaging tone. Use behavioral psychology to lower the barrier to cooking:
- "Energy ROI" Pitch: Remind the user why cooking is faster/cheaper/healthier than delivery when they are tired.
- "Just 5 Minutes" Rule: Suggest micro-tasks (e.g., "Just chop one pepper, then decide if you want to quit") to build cooking momentum.
- Clean-As-You-Go Prompts: Explicitly build cleanup steps into the cooking timeline so they aren't left with a messy kitchen.
- Backup "Panic Button": If the user falls behind schedule, automatically offer a 10-minute audible pivot meal that preserves the vibe of the original plan.

### 4. DYNAMIC MOTIVATION STYLES
Allow the user to toggle or implicitly trigger three motivational voices:
1. "The Hype Bestie" (High-energy, celebratory, focuses on reward).
2. "The Stoic Realist" (Grounding, focuses on discipline and future-self benefits).
3. "The Pocket Mom" (Nurturing, comforting, focuses on self-care and ease).

Always format your output using clear markdown headers, bold text for key milestones, and actionable, gamified task phrasing (e.g., "Defeat the Onions" instead of "Chop onions").
`;

// Offline Demo Presets (High Fidelity Mock Responses)
const PRESETS = {
  fatigue: {
    motivationQuote: {
      hype: "OMG, I know you're running on empty, but we've got this! Sheet-pan dinner means 5 minutes of effort, and then we just chill. Future-you is gonna celebrate this win!",
      stoic: "You are tired. That is a fact. But ordering greasy takeout will only compound the fatigue. Roast this chicken; discipline is the ultimate self-care.",
      mom: "Oh, sweetie, you must be exhausted after all those meetings. Let's just throw some veggies and chicken on a single tray. No fuss, no sink full of dishes. Just a warm, nourishing meal."
    },
    meals: {
      breakfast: {
        title: "5-Minute Egg-in-a-Hole",
        desc: "A single slice of bread with a hole cut out, fried in a pan with an egg in the center. Pure simplicity.",
        time: "5 mins",
        difficulty: "Easy",
        cleanup: "1 skillet"
      },
      lunch: {
        title: "No-Cook Dump & Mix Tuna Salad",
        desc: "Canned tuna mashed with Greek yogurt, mustard, and sweet relish. Eaten straight out of the prep bowl with crackers.",
        time: "8 mins",
        difficulty: "Easy",
        cleanup: "1 bowl, 1 fork"
      },
      dinner: {
        title: "Defeat the Fatigue Sheet-Pan Garlic Chicken & Broccoli",
        desc: "Chicken tenders and broccoli florets tossed directly on a baking sheet with olive oil, garlic powder, salt, and pepper. Roasted at high heat.",
        time: "20 mins",
        difficulty: "Easy",
        cleanup: "1 sheet pan"
      }
    },
    energyRoiPitch: "Fast food delivery takes 45 minutes and costs $25. Cooking this sheet-pan meal takes 15 minutes of hands-on time, costs $4.50, and keeps your body fueled with clean protein instead of a sodium crash.",
    cleanupPromptText: "While the sheet pan is roasting in the oven for 15 minutes, wash the chopping board and knife. Put the olive oil back in the cupboard. Eat dinner with zero cleanup left to do!",
    prepTasks: [
      { label: "Attack the Broccoli: Chop 1 head of broccoli into small florets", time: "2 min", difficulty: "Easy", isCleanPrompt: false },
      { label: "Deploy the Chicken: Slice chicken breasts into bite-sized tenders", time: "3 min", difficulty: "Easy", isCleanPrompt: false },
      { label: "The Oil Spill: Drizzle sheet pan with oil, garlic powder, salt, and pepper, tossing broccoli & chicken directly on it", time: "2 min", difficulty: "Easy", isCleanPrompt: false },
      { label: "Oven Launch: Insert tray into preheated oven at 400°F and set timer for 15 min", time: "1 min", difficulty: "Easy", isCleanPrompt: false },
      { label: "Simultaneous Sink Wipeout: Wash the cutting board and knife while the oven roasts", time: "3 min", difficulty: "Easy", isCleanPrompt: true }
    ],
    groceryAisles: [
      {
        aisle: "Produce",
        items: ["Broccoli (1 head)", "Lemon (1)"]
      },
      {
        aisle: "Meat",
        items: ["Chicken Breasts or Tenders (1 lb)"]
      },
      {
        aisle: "Pantry Staples",
        items: ["Garlic Powder", "Olive Oil", "Canned Tuna (1 can)"]
      }
    ],
    substitutions: [
      { target: "Broccoli", swap: "Zucchini or Asparagus", context: "Both roast just as quickly on a sheet pan." },
      { target: "Chicken", swap: "Firm Tofu Blocks", context: "Drain, press, cube, and roast similarly for a vegetarian option." },
      { target: "Greek yogurt", swap: "Mayonnaise", context: "For the tuna salad if you don't have yogurt." }
    ],
    budget: {
      title: "Budget Status: Pantry-Friendly",
      desc: "This meal plan relies heavily on basic proteins and shelf-stable pantry items. Very low out-of-pocket spend required.",
      cost: "$6.50",
      isSplurge: false
    },
    panicMeal: {
      title: "The 10-Minute Upgrade Ramen",
      desc: "Ditch the sheet pan entirely. Instant ramen base, but we elevate it with a poached egg and fresh green scallions.",
      steps: [
        "Bring 2 cups of water to a boil in a small pot.",
        "Drop noodles and half the flavor packet (keeps sodium low!).",
        "Crack 1 fresh egg directly into the boiling broth in the final 2 minutes. Do not stir—let it poach beautifully.",
        "Use scissors to snip scallions directly into your eating bowl. Pour ramen in, add a splash of soy sauce or sriracha, and devour.",
        "Rinse the pot immediately with hot water so the starch doesn't stick."
      ]
    }
  },
  commute: {
    motivationQuote: {
      hype: "Double check your slow cooker settings, because walking in the door at 8 PM to hot, bubbling shredded chicken tacos is a MAJOR flex! Let's get it set up!",
      stoic: "You have a late evening ahead. Prep the slow cooker now. It takes 4 minutes, and ensures you do not cave to low-effort delivery choices tonight.",
      mom: "Sweetheart, you're going to get home so late and hungry. Spend just 5 minutes this morning setting up the slow cooker, so it can welcome you home with a hot meal."
    },
    meals: {
      breakfast: {
        title: "Cold-Brew Overnight Oats",
        desc: "Rolled oats mixed with milk, chia seeds, and a splash of maple syrup. Made in a jar the night before.",
        time: "2 mins",
        difficulty: "Easy",
        cleanup: "No pots"
      },
      lunch: {
        title: "The Commuter Special Turkey Wrap",
        desc: "Slices of turkey breast, Swiss cheese, and spinach rolled in a flour tortilla with mustard.",
        time: "5 mins",
        difficulty: "Easy",
        cleanup: "Knife-only"
      },
      dinner: {
        title: "Set-and-Forget Slow Cooker Salsa Chicken Tacos",
        desc: "Chicken breasts slow-cooked in a jar of salsa and taco seasoning. Shredded and served in warm corn tortillas.",
        time: "15 mins prep / 6 hours cook",
        difficulty: "Easy",
        cleanup: "Slow cooker pot"
      }
    },
    energyRoiPitch: "An late-night Mexican takeout order will cost $22 and arrive cold. Prepping this slow cooker taco dinner takes 3 minutes in the morning and costs $2.00 per serving.",
    cleanupPromptText: "When you finish preparing the slow cooker in the morning, rinse the salsa jar and recycle it immediately. When you eat tonight, you only have the slow cooker bowl and your plate to clean!",
    prepTasks: [
      { label: "Slow Cooker Deployment: Lay 2 chicken breasts in the crock pot", time: "1 min", difficulty: "Easy", isCleanPrompt: false },
      { label: "Salsa Rain: Pour 1 full jar of salsa and 1 packet of taco seasoning over chicken", time: "1 min", difficulty: "Easy", isCleanPrompt: false },
      { label: "Lock Down: Secure the lid, set slow cooker to LOW for 6-8 hours", time: "1 min", difficulty: "Easy", isCleanPrompt: false },
      { label: "EVENING SHRED: Shred the tender chicken inside the cooker with two forks", time: "3 min", difficulty: "Easy", isCleanPrompt: false },
      { label: "Taco Assembly: Toast tortillas in a dry skillet for 30s before loaded with chicken", time: "2 min", difficulty: "Easy", isCleanPrompt: false }
    ],
    groceryAisles: [
      {
        aisle: "Meat",
        items: ["Chicken Breasts (1.5 lbs)", "Deli Turkey Slices (0.5 lb)"]
      },
      {
        aisle: "Dairy / Fresh",
        items: ["Shredded Cheddar Cheese (1 bag)", "Swiss Cheese Slices", "Baby Spinach"]
      },
      {
        aisle: "Pantry Staples",
        items: ["Jar of Salsa (16 oz)", "Taco Seasoning Packet", "Corn or Flour Tortillas", "Rolled Oats"]
      }
    ],
    substitutions: [
      { target: "Chicken Breasts", swap: "Canned Black Beans", context: "Drain beans, mix with salsa and seasoning, heat for quick tacos." },
      { target: "Salsa", swap: "Diced Canned Tomatoes + Chili Powder", context: "If you don't have jarred salsa." },
      { target: "Swiss Cheese", swap: "Provolone or Cheddar", context: "Any sliced cheese works for the wrap." }
    ],
    budget: {
      title: "Budget Status: Highly Feasible",
      desc: "Slow cooker meals are excellent for budget control. High volume, cheap ingredients, and multiple portions.",
      cost: "$8.20",
      isSplurge: false
    },
    panicMeal: {
      title: "The 5-Minute Crispy Cheese Quesadilla",
      desc: "Did you forget to set the slow cooker? Toss a tortilla in a hot pan, pile it with cheese and salsa, fold in half, and sear until golden and melted.",
      steps: [
        "Heat a skillet over medium-high heat. Place a tortilla flat on the dry pan.",
        "Sprinkle cheese, salsa, and any deli turkey leftovers on one half.",
        "Fold the tortilla in half. Cook for 2 minutes, then flip and cook for 2 minutes more until crispy.",
        "Wipe the skillet clean immediately with a paper towel. Zero pans to wash!"
      ]
    }
  },
  stakes: {
    motivationQuote: {
      hype: "Romance is in the air, baby! We are making a restaurant-level salmon tonight! We'll knock out the prep at lunch so you can take a shower, put on nice clothes, and cook effortlessly tonight. Let's do this!",
      stoic: "Treat tonight like a operation. Executing the 3-minute marinade prep at lunch guarantees a calm, precise, and impressive dinner service tonight.",
      mom: "Oh, cooking a special meal for someone is such a lovely gesture. Let's get the messy parts done during the day, so you can have a quiet kitchen and enjoy your evening together."
    },
    meals: {
      breakfast: {
        title: "Elegant Avocado Toast",
        desc: "Mashed avocado on toasted sourdough, topped with lemon juice, sea salt, and red pepper flakes.",
        time: "5 mins",
        difficulty: "Easy",
        cleanup: "1 knife, 1 toaster"
      },
      lunch: {
        title: "Quick Mediterranean Salad",
        desc: "Canned chickpeas, cucumber, cherry tomatoes, and feta cheese tossed with olive oil and lemon.",
        time: "10 mins",
        difficulty: "Easy",
        cleanup: "1 bowl"
      },
      dinner: {
        title: "Tuscan Garlic Butter Creamy Salmon",
        desc: "Pan-seared salmon fillets in a rich garlic cream sauce with wilted spinach and blistered cherry tomatoes. Prepped ahead, cooked live.",
        time: "25 mins (with lunch prep)",
        difficulty: "Medium",
        cleanup: "1 cutting board, 1 skillet"
      }
    },
    energyRoiPitch: "A restaurant date night for two easily exceeds $90. Preparing this luxury Tuscan Salmon at home costs $22.00, offers the same gourmet experience, and creates a much more intimate, cozy atmosphere.",
    cleanupPromptText: "During the 7 minutes the salmon is searing, wash your cutting board and discard the spinach bags. Wipe down the counter so you serve dinner in a beautiful, spotless environment.",
    prepTasks: [
      { label: "LUNCH BREAK: Garlic Obliteration: Mince 4 cloves of garlic and chop fresh parsley", time: "3 min", difficulty: "Easy", isCleanPrompt: false },
      { label: "LUNCH BREAK: Salmon Spa: Rub salmon fillets with olive oil, minced garlic, lemon juice, salt, and pepper; cover in fridge", time: "3 min", difficulty: "Easy", isCleanPrompt: false },
      { label: "DINNER HOUR: Salmon Sear: Cook salmon in a hot skillet with butter (4 mins skin down, 3 mins flip); transfer to plate", time: "7 min", difficulty: "Medium", isCleanPrompt: false },
      { label: "DINNER HOUR: Build the Cream Empire: Sauté cherry tomatoes & garlic in the same pan, toss in spinach until wilted, stir in cream", time: "5 min", difficulty: "Medium", isCleanPrompt: false },
      { label: "DINNER HOUR: The Reunion: Slide salmon back into the simmering sauce, spooning sauce over fish", time: "3 min", difficulty: "Easy", isCleanPrompt: false },
      { label: "Clean Sizzling Cleanup: Wash the skillet immediately after plating while the pan is hot", time: "3 min", difficulty: "Easy", isCleanPrompt: true }
    ],
    groceryAisles: [
      {
        aisle: "Seafood",
        items: ["Fresh Salmon Fillets (2, skin-on)"]
      },
      {
        aisle: "Produce",
        items: ["Cherry Tomatoes (1 pint)", "Fresh Spinach (1 bag)", "Fresh Parsley", "Garlic (1 bulb)", "Lemon (1)"]
      },
      {
        aisle: "Dairy",
        items: ["Heavy Cream (1 half-pint)", "Unsalted Butter (1 stick)", "Feta Cheese Block"]
      },
      {
        aisle: "Pantry",
        items: ["Chickpeas (1 can)", "Cucumber (1)", "Sourdough Bread", "Avocado"]
      }
    ],
    substitutions: [
      { target: "Salmon Fillets", swap: "Chicken Breasts (thin cut)", context: "Tastes amazing in the same Tuscan cream sauce, just cook chicken 5-6 mins per side." },
      { target: "Heavy Cream", swap: "Canned Coconut Milk", context: "Great dairy-free substitute that still remains rich and thick." },
      { target: "Sourdough", swap: "Any sandwich bread or rye", context: "For the breakfast toast." }
    ],
    budget: {
      title: "Budget Status: Moderate Splurge",
      desc: "Uses premium salmon and fresh cream. Ideal for special occasions; still 75% cheaper than dining out.",
      cost: "$22.00",
      isSplurge: true
    },
    panicMeal: {
      title: "The 10-Minute Date Night Cacio e Pepe",
      desc: "Did dinner plans fall behind? Make this simple, incredibly chic Roman pasta using just spaghetti, butter, black pepper, and parmesan.",
      steps: [
        "Boil spaghetti in a wide pan with a small amount of salted water (saves boiling time and concentrates starch).",
        "Grate 1 cup of Parmesan or Pecorino cheese. Grind 1 tablespoon of black pepper.",
        "Drain pasta, reserving 1 cup of hot starchy pasta water. Toss pasta with butter, pepper, cheese, and splashes of water until a creamy sauce forms.",
        "Plate in deep bowls, top with more cheese, and serve. Chic, fast, delicious."
      ]
    }
  }
};

// Initialize Application
document.addEventListener('DOMContentLoaded', async () => {
  // Load saved API key
  const savedKey = localStorage.getItem('gemini_api_key');
  if (savedKey) {
    document.getElementById('api-key-input').value = savedKey;
    updateApiStatus('Key loaded from storage', 'success');
  }

  // Try to load key from local .env configuration
  await loadEnvApiKey();

  // Trigger icons
  if (window.lucide) {
    lucide.createIcons();
  }
});

// Helper to load and parse API key from local .env file
async function loadEnvApiKey() {
  try {
    const response = await fetch('/.env');
    if (response.ok) {
      const text = await response.text();
      const match = text.match(/GEMINI_API_KEY\s*=\s*(.+)/);
      if (match && match[1]) {
        const key = match[1].trim();
        if (key && key !== 'YOUR_GEMINI_API_KEY_HERE' && key !== 'YOUR_API_KEY_HERE') {
          localStorage.setItem('gemini_api_key', key);
          document.getElementById('api-key-input').value = key;
          updateApiStatus('Key loaded from .env file', 'success');
        }
      }
    }
  } catch (err) {
    console.log('No local .env file found or accessible via fetch.');
  }
}

// Mode switching: Demo vs Live
function switchMode(mode) {
  appMode = mode;
  
  const demoBtn = document.getElementById('mode-demo-btn');
  const liveBtn = document.getElementById('mode-live-btn');
  const apiPanel = document.getElementById('api-panel');
  const demoPresets = document.getElementById('demo-presets-container');
  const liveInputs = document.getElementById('live-inputs-container');
  
  if (mode === 'demo') {
    demoBtn.classList.add('active');
    liveBtn.classList.remove('active');
    apiPanel.classList.add('hidden');
    demoPresets.classList.remove('hidden');
    liveInputs.classList.add('hidden');
  } else {
    demoBtn.classList.remove('active');
    liveBtn.classList.add('active');
    apiPanel.classList.remove('hidden');
    demoPresets.classList.add('hidden');
    liveInputs.classList.remove('hidden');
  }
}

// Collapsible API Settings
function toggleApiSettings() {
  const body = document.getElementById('api-body');
  const chevron = document.getElementById('api-chevron');
  
  if (body.classList.contains('collapsed')) {
    body.classList.remove('collapsed');
    chevron.setAttribute('data-lucide', 'chevron-up');
  } else {
    body.classList.add('collapsed');
    chevron.setAttribute('data-lucide', 'chevron-down');
  }
  lucide.createIcons();
}

// Save API key
function saveApiKey() {
  const input = document.getElementById('api-key-input');
  const key = input.value.trim();
  
  if (!key) {
    localStorage.removeItem('gemini_api_key');
    updateApiStatus('Key cleared', 'error');
    return;
  }
  
  localStorage.setItem('gemini_api_key', key);
  updateApiStatus('Key saved successfully!', 'success');
  
  // Collapse panel after saving
  setTimeout(() => {
    toggleApiSettings();
  }, 1000);
}

function updateApiStatus(text, type) {
  const el = document.getElementById('api-status');
  el.textContent = text;
  el.className = 'api-status-text ' + type;
}

// Preset selection card handler
function selectPreset(presetName) {
  selectedPreset = presetName;
  
  // Toggle active class on cards
  const cards = document.querySelectorAll('.preset-card');
  cards.forEach(card => card.classList.remove('active'));
  
  // Find card representing presetName
  let index = 0;
  if (presetName === 'commute') index = 1;
  if (presetName === 'stakes') index = 2;
  cards[index].classList.add('active');
  
  // Update UI if we're changing options
  const fatigueMed = document.getElementById('fatigue-med');
  const fatigueHigh = document.getElementById('fatigue-high');
  const budgetPantry = document.getElementById('budget-pantry');
  const budgetSplurge = document.getElementById('budget-splurge');
  
  if (presetName === 'fatigue') {
    fatigueHigh.checked = true;
    budgetPantry.checked = true;
  } else if (presetName === 'commute') {
    fatigueMed.checked = true;
    budgetPantry.checked = true;
  } else if (presetName === 'stakes') {
    fatigueMed.checked = true;
    budgetSplurge.checked = true;
  }
}

// Extras tab switcher: Subs vs Budget
function switchExtrasTab(tab) {
  const subsBtn = document.getElementById('tab-subs');
  const budgetBtn = document.getElementById('tab-budget');
  const subsContent = document.getElementById('content-subs');
  const budgetContent = document.getElementById('content-budget');
  
  if (tab === 'subs') {
    subsBtn.classList.add('active');
    budgetBtn.classList.remove('active');
    subsContent.classList.remove('hidden');
    budgetContent.classList.add('hidden');
  } else {
    subsBtn.classList.remove('active');
    budgetBtn.classList.add('active');
    subsContent.classList.add('hidden');
    budgetContent.classList.remove('hidden');
  }
}

// General generation trigger
async function generateMealPlan() {
  const loader = document.getElementById('generate-loader');
  const btnText = document.getElementById('generate-btn-text');
  
  // Reset Panic
  isPanicActive = false;
  backupOriginalDinner = null;
  
  loader.classList.remove('hidden');
  btnText.textContent = 'Analyzing Context...';
  document.getElementById('generate-btn').disabled = true;
  
  const voice = document.querySelector('input[name="voice"]:checked').value;
  const fatigue = document.querySelector('input[name="fatigue"]:checked').value;
  const budget = document.querySelector('input[name="budget"]:checked').value;
  
  try {
    if (appMode === 'demo') {
      // Offline generation
      await new Promise(resolve => setTimeout(resolve, 800)); // Simulate brain activity
      const dataPreset = PRESETS[selectedPreset];
      
      // Structure the data to match current selected parameters
      currentData = JSON.parse(JSON.stringify(dataPreset));
      // Override motivation quote based on selected voice
      currentData.activeQuote = dataPreset.motivationQuote[voice];
      
      renderPlan(currentData, voice);
    } else {
      // Live Gemini Mode
      const apiKey = localStorage.getItem('gemini_api_key') || document.getElementById('api-key-input').value.trim();
      if (!apiKey) {
        alert('Please enter and save a Gemini API Key first!');
        throw new Error('API key is missing.');
      }
      
      const customSchedule = document.getElementById('schedule-input').value.trim() || 'A standard busy work day.';
      currentData = await fetchLivePlan(apiKey, customSchedule, fatigue, budget, voice);
      currentData.activeQuote = currentData.motivationQuote; // LLM output structured directly
      renderPlan(currentData, voice);
    }
    
    // Hide Welcome, Show Plan panel
    document.getElementById('welcome-panel').classList.add('hidden');
    document.getElementById('plan-panel').classList.remove('hidden');
    
  } catch (err) {
    console.error(err);
    if (appMode === 'live') {
      alert('Error fetching data from Gemini API. Please verify your API Key and internet connection. Check the console for more details.');
    }
  } finally {
    loader.classList.add('hidden');
    btnText.textContent = 'Generate My Cooking Plan';
    document.getElementById('generate-btn').disabled = false;
  }
}

// Rendering UI
function renderPlan(data, voice) {
  // Reset completed sets
  completedGrocery.clear();
  completedPrep.clear();
  
  // 1. Motivation Quote
  let voiceName = "The Hype Bestie";
  let voiceIcon = "flame";
  if (voice === 'stoic') {
    voiceName = "The Stoic Realist";
    voiceIcon = "compass";
  } else if (voice === 'mom') {
    voiceName = "The Pocket Mom";
    voiceIcon = "heart";
  }
  
  document.getElementById('m-voice-title').textContent = `${voiceName} says:`;
  document.getElementById('m-voice-quote').textContent = `"${data.activeQuote}"`;
  document.getElementById('m-voice-icon').setAttribute('data-lucide', voiceIcon);
  
  // 2. Meal Cards
  // Breakfast
  document.getElementById('b-meal-title').textContent = data.meals.breakfast.title;
  document.getElementById('b-meal-desc').textContent = data.meals.breakfast.desc;
  document.getElementById('b-meal-time').innerHTML = `<i data-lucide="clock"></i> ${data.meals.breakfast.time}`;
  document.getElementById('b-meal-difficulty').innerHTML = `<i data-lucide="gauge"></i> ${data.meals.breakfast.difficulty}`;
  document.getElementById('b-meal-cleanup').innerHTML = `<i data-lucide="sparkle"></i> ${data.meals.breakfast.cleanup}`;
  
  // Lunch
  document.getElementById('l-meal-title').textContent = data.meals.lunch.title;
  document.getElementById('l-meal-desc').textContent = data.meals.lunch.desc;
  document.getElementById('l-meal-time').innerHTML = `<i data-lucide="clock"></i> ${data.meals.lunch.time}`;
  document.getElementById('l-meal-difficulty').innerHTML = `<i data-lucide="gauge"></i> ${data.meals.lunch.difficulty}`;
  document.getElementById('l-meal-cleanup').innerHTML = `<i data-lucide="sparkle"></i> ${data.meals.lunch.cleanup}`;
  
  // Dinner
  document.getElementById('d-meal-title').textContent = data.meals.dinner.title;
  document.getElementById('d-meal-desc').textContent = data.meals.dinner.desc;
  document.getElementById('d-meal-time').innerHTML = `<i data-lucide="clock"></i> ${data.meals.dinner.time}`;
  document.getElementById('d-meal-difficulty').innerHTML = `<i data-lucide="gauge"></i> ${data.meals.dinner.difficulty}`;
  document.getElementById('d-meal-cleanup').innerHTML = `<i data-lucide="sparkle"></i> ${data.meals.dinner.cleanup}`;
  
  // 3. Energy ROI & Cleanup Text
  document.getElementById('energy-roi-pitch').innerHTML = `<strong>Energy ROI Tip:</strong> ${data.energyRoiPitch}`;
  document.getElementById('cleanup-prompt-text').textContent = data.cleanupPromptText;
  
  // 4. Prep Checklist
  const prepContainer = document.getElementById('prep-checklist');
  prepContainer.innerHTML = '';
  data.prepTasks.forEach((task, idx) => {
    const item = document.createElement('div');
    item.className = 'task-item';
    item.onclick = () => togglePrepTask(idx);
    item.id = `prep-task-${idx}`;
    
    item.innerHTML = `
      <div class="task-checkbox-wrapper">
        <div class="task-checkbox"><i data-lucide="check"></i></div>
      </div>
      <div class="task-content">
        <span class="task-label">${task.label}</span>
        <div class="task-meta-row">
          <span class="task-meta"><i data-lucide="clock"></i> ${task.time}</span>
          <span class="task-meta"><i data-lucide="gauge"></i> ${task.difficulty}</span>
          ${task.isCleanPrompt ? `<span class="task-meta clean-prompt"><i data-lucide="spray-can"></i> Clean-As-You-Go</span>` : ''}
        </div>
      </div>
    `;
    prepContainer.appendChild(item);
  });
  
  // 5. Grocery List
  const groceryContainer = document.getElementById('grocery-aisles-list');
  groceryContainer.innerHTML = '';
  
  let gIdx = 0;
  data.groceryAisles.forEach(block => {
    const aisleBlock = document.createElement('div');
    aisleBlock.className = 'grocery-aisle-block';
    
    const aisleTitle = document.createElement('div');
    aisleTitle.className = 'grocery-aisle-title';
    aisleTitle.innerHTML = `<i data-lucide="store"></i> ${block.aisle}`;
    aisleBlock.appendChild(aisleTitle);
    
    const list = document.createElement('div');
    list.className = 'grocery-items-list';
    
    block.items.forEach(gItem => {
      const itemEl = document.createElement('div');
      itemEl.className = 'grocery-item';
      const thisIdx = gIdx++;
      itemEl.onclick = () => toggleGroceryItem(thisIdx);
      itemEl.id = `grocery-item-${thisIdx}`;
      
      itemEl.innerHTML = `
        <div class="grocery-checkbox"><i data-lucide="check"></i></div>
        <span class="grocery-item-name">${gItem}</span>
      `;
      list.appendChild(itemEl);
    });
    
    aisleBlock.appendChild(list);
    groceryContainer.appendChild(aisleBlock);
  });
  
  // 6. Substitutions
  const subsContainer = document.getElementById('subs-list-container');
  subsContainer.innerHTML = '';
  data.substitutions.forEach(sub => {
    const li = document.createElement('li');
    li.className = 'sub-item';
    li.innerHTML = `
      <div>
        <span class="sub-item-target">${sub.target}</span>
        <span class="sub-item-arrow">&rarr;</span>
        <span class="sub-item-swap">${sub.swap}</span>
      </div>
      <div class="sub-item-context">${sub.context}</div>
    `;
    subsContainer.appendChild(li);
  });
  
  // 7. Budget Status
  const budgetBox = document.getElementById('budget-status-box');
  const budgetTitle = document.getElementById('budget-title');
  const budgetDesc = document.getElementById('budget-desc');
  const budgetIndicatorIcon = document.getElementById('budget-indicator-icon');
  
  budgetTitle.textContent = data.budget.title;
  budgetDesc.textContent = data.budget.desc;
  document.getElementById('budget-cost').textContent = data.budget.cost;
  
  if (data.budget.isSplurge) {
    budgetBox.className = 'budget-status-card splurge';
    budgetIndicatorIcon.setAttribute('data-lucide', 'sparkles');
  } else {
    budgetBox.className = 'budget-status-card';
    budgetIndicatorIcon.setAttribute('data-lucide', 'check-circle');
  }
  
  // 8. Re-trigger lucide icons
  lucide.createIcons();
  
  // Update progress bars
  updatePrepProgress();
  updateGroceryProgress();
  switchExtrasTab('subs');
}

// Checklist Check Actions
function togglePrepTask(idx) {
  const item = document.getElementById(`prep-task-${idx}`);
  if (completedPrep.has(idx)) {
    completedPrep.delete(idx);
    item.classList.remove('checked');
  } else {
    completedPrep.add(idx);
    item.classList.add('checked');
    // Sound/feedback effects could be triggered here
  }
  updatePrepProgress();
}

function updatePrepProgress() {
  const total = currentData ? currentData.prepTasks.length : 0;
  const done = completedPrep.size;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  
  document.getElementById('prep-progress-bar').style.width = `${pct}%`;
  document.getElementById('prep-progress-text').textContent = `${pct}% Done`;
}

function toggleGroceryItem(idx) {
  const item = document.getElementById(`grocery-item-${idx}`);
  if (completedGrocery.has(idx)) {
    completedGrocery.delete(idx);
    item.classList.remove('checked');
  } else {
    completedGrocery.add(idx);
    item.classList.add('checked');
  }
  updateGroceryProgress();
}

function updateGroceryProgress() {
  const total = document.querySelectorAll('.grocery-item').length;
  const done = completedGrocery.size;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  
  document.getElementById('grocery-progress-bar').style.width = `${pct}%`;
  document.getElementById('grocery-progress-text').textContent = `${pct}% Done`;
}

// Panic Button Implementation
function triggerPanicPivot() {
  if (!currentData || !currentData.panicMeal) return;
  
  // Set modal details
  document.getElementById('panic-meal-title').textContent = currentData.panicMeal.title;
  document.getElementById('panic-meal-desc').textContent = currentData.panicMeal.desc;
  
  const stepsContainer = document.getElementById('panic-meal-steps');
  stepsContainer.innerHTML = '';
  currentData.panicMeal.steps.forEach(step => {
    const li = document.createElement('li');
    li.innerHTML = step;
    stepsContainer.appendChild(li);
  });
  
  // Show Modal
  document.getElementById('panic-modal').classList.remove('hidden');
}

function closePanicModal() {
  document.getElementById('panic-modal').classList.add('hidden');
}

function acceptPanicPivot() {
  if (!currentData || isPanicActive) {
    closePanicModal();
    return;
  }
  
  isPanicActive = true;
  // Backup original dinner details
  backupOriginalDinner = {
    title: currentData.meals.dinner.title,
    desc: currentData.meals.dinner.desc,
    time: currentData.meals.dinner.time,
    difficulty: currentData.meals.dinner.difficulty,
    cleanup: currentData.meals.dinner.cleanup,
    prepTasks: [...currentData.prepTasks]
  };
  
  // Update dinner in UI
  document.getElementById('d-meal-title').textContent = currentData.panicMeal.title;
  document.getElementById('d-meal-desc').textContent = currentData.panicMeal.desc;
  document.getElementById('d-meal-time').innerHTML = `<i data-lucide="clock"></i> 10 mins`;
  document.getElementById('d-meal-difficulty').innerHTML = `<i data-lucide="gauge"></i> Easy`;
  document.getElementById('d-meal-cleanup').innerHTML = `<i data-lucide="sparkle"></i> Very Low Cleanup`;
  
  // Update Prep Checklist to show panic steps instead
  const prepContainer = document.getElementById('prep-checklist');
  prepContainer.innerHTML = '';
  completedPrep.clear();
  
  currentData.panicMeal.steps.forEach((step, idx) => {
    const item = document.createElement('div');
    item.className = 'task-item';
    item.onclick = () => togglePrepTask(idx);
    item.id = `prep-task-${idx}`;
    
    // Parse step text to make a gamified label
    let cleanPrompt = step.toLowerCase().includes('clean') || step.toLowerCase().includes('rinse');
    
    item.innerHTML = `
      <div class="task-checkbox-wrapper">
        <div class="task-checkbox"><i data-lucide="check"></i></div>
      </div>
      <div class="task-content">
        <span class="task-label">${step}</span>
        <div class="task-meta-row">
          <span class="task-meta"><i data-lucide="clock"></i> 2 min</span>
          <span class="task-meta"><i data-lucide="gauge"></i> Easy</span>
          ${cleanPrompt ? `<span class="task-meta clean-prompt"><i data-lucide="spray-can"></i> Clean-As-You-Go</span>` : ''}
        </div>
      </div>
    `;
    prepContainer.appendChild(item);
  });
  
  // Swap current data prep tasks reference
  currentData.prepTasks = currentData.panicMeal.steps.map(step => {
    return {
      label: step,
      time: "2 min",
      difficulty: "Easy",
      isCleanPrompt: step.toLowerCase().includes('clean') || step.toLowerCase().includes('rinse')
    };
  });
  
  updatePrepProgress();
  lucide.createIcons();
  closePanicModal();
}

// API Integration Core Call (Direct fetch to Gemini API in browser)
async function fetchLivePlan(apiKey, schedule, fatigue, budget, voice) {
  // Let the user know we're prompting the API
  const modelName = "gemini-2.5-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
  
  const userPrompt = `
Generate a personalized cooking to-do plan based on the following context.
User Schedule: "${schedule}"
Energy / Fatigue level: "${fatigue}"
Budget Preference: "${budget}" (low: pantry-first/budget, high: splurge/fancy)
Selected Motivational Voice: "${voice}" (hype: The Hype Bestie, stoic: The Stoic Realist, mom: The Pocket Mom)

You must output a single JSON object. Ensure that the motivational quote is strictly written in the tone of the selected voice ("${voice}").
All tasks in the prepTasks must be phrased in a gamified, actionable way (e.g. "Defeat the Onions" instead of "Chop onions").
If energy is high, prepTasks can contain more steps. If energy is high-fatigue, prepTasks must be brief and emphasize one-pot simplicity.
If date-night or high-stakes context is detected in their schedule, implement an "Invisible Prep" timeline with steps marked as "LUNCH BREAK" or similar.
Provide a 10-minute backup panicMeal that matches the vibe of the dinner but is fast and simple.

Response JSON Schema:
{
  "motivationQuote": "string (in the voice of ${voice})",
  "meals": {
    "breakfast": { "title": "string", "desc": "string", "time": "string", "difficulty": "string", "cleanup": "string" },
    "lunch": { "title": "string", "desc": "string", "time": "string", "difficulty": "string", "cleanup": "string" },
    "dinner": { "title": "string", "desc": "string", "time": "string", "difficulty": "string", "cleanup": "string" }
  },
  "energyRoiPitch": "string (behavioral psychology pitch for cooking vs delivery)",
  "cleanupPromptText": "string (integrated clean-as-you-go prompt)",
  "prepTasks": [
    { "label": "string (gamified)", "time": "string", "difficulty": "string", "isCleanPrompt": boolean }
  ],
  "groceryAisles": [
    { "aisle": "string", "items": ["string"] }
  ],
  "substitutions": [
    { "target": "string", "swap": "string", "context": "string" }
  ],
  "budget": {
    "title": "string (e.g., Budget Status: Pantry-Friendly)",
    "desc": "string (explanation of cost audit)",
    "cost": "string (estimated dollar cost)",
    "isSplurge": boolean
  },
  "panicMeal": {
    "title": "string",
    "desc": "string",
    "steps": ["string"]
  }
}
`;

  const requestBody = {
    contents: [
      {
        role: "user",
        parts: [
          { text: SOUS_CHEF_SYSTEM_INSTRUCTION },
          { text: userPrompt }
        ]
      }
    ],
    generationConfig: {
      responseMimeType: "application/json",
      temperature: 0.7
    }
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API Error: ${response.status} - ${errorText}`);
  }

  const result = await response.json();
  const textResponse = result.candidates[0].content.parts[0].text;
  
  // Parse clean JSON output
  try {
    return JSON.parse(textResponse);
  } catch (err) {
    console.error("Failed to parse JSON response from Gemini API: ", textResponse);
    throw new Error("Invalid JSON structure from model");
  }
}
