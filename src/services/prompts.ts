/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

/**
 * A list of prompt suggestions.
 * @type {{emoji: string, prompt: string}[]}
 */
export const promptSuggestions = [
  { emoji: '🤖', prompt: 'Make a cool micro sci-fi story spanning a Millenia about a robot and its maker.' },
  { emoji: '💡', prompt: 'I just had a great idea! in style of a hand-drawn pencil sketch.' },
  { emoji: '🛑', prompt: 'Tell a little story using the objects in the image, in style of stop-motion animation.' },
  { emoji: '💫', prompt: 'Spin the scene 360 degrees in 3D.' },
  { emoji: '🌸', prompt: 'Flower up the scene.' },
  { emoji: '🏃', prompt: 'Tell them I\'m "On my way!", 80s video game style' },
];

/**
 * Builds the creative instruction for the animation.
 * @param {string} storyPrompt - The prompt for the story.
 * @param {string | null} originalImage - The original image.
 * @param {number} frameCount - The number of frames in the animation.
 * @returns {string} The creative instruction.
 */
export const buildCreativeInstruction = (
  storyPrompt: string,
  originalImage: string | null,
  frameCount: number
): string => {
  const gridDim = Math.sqrt(frameCount);

  const motionInstruction = `
MOTION REQUIREMENTS:
- The animation must depict a single, continuous, and chronologically ordered sequence of motion. Each frame must logically follow the previous one.
- The movement should be smooth, with small, incremental changes between frames to create a believable sense of action.
- The final frame must loop back smoothly to the first frame to create a seamless cycle.
`;

  const styleConsistencyInstruction = `It is crucial that all ${frameCount} frames are in the same, consistent artistic style.`;
  const identityLockInstruction = `Maintain the subject's core facial features and identity consistently across all frames. The person or subject should be clearly recognizable from one frame to the next. Avoid distorting the face or adding new features.`;
  
  const frameDurationInstruction = `
Based on the creative direction, determine the optimal frame duration for the animation.
- For slow, story-like animations, choose a longer duration (e.g., 400-2000ms per frame).
- For fast, dynamic animations, choose a shorter duration (e.g., 80-120ms per frame).
`;

  let creativeDirection = '';
  if (originalImage) {
    creativeDirection = `
CREATIVE DIRECTION (based on user image and prompt):
Animate the subject from the provided image based on the following description: "${storyPrompt}".
${motionInstruction}
${styleConsistencyInstruction}
${identityLockInstruction}`;
  } else if (storyPrompt) {
    creativeDirection = `
CREATIVE DIRECTION (based on user prompt):
Create an animation from scratch based on the following description: "${storyPrompt}".
${motionInstruction}`;
  } else {
      return '';
  }
  
  return `
PRIMARY GOAL: Generate a single animated sprite sheet image.

You are an expert animator. Your task is to create a ${frameCount}-frame animated sprite sheet.

${creativeDirection}

${frameDurationInstruction}

IMAGE OUTPUT REQUIREMENTS:
- The output MUST be a single, square image file.
- The image MUST be precisely 1024x1024 pixels.
- The image must contain ${frameCount} animation frames arranged in a ${gridDim}x${gridDim} grid.
- Do not add numbers to the frames.

REQUIRED RESPONSE FORMAT:
Your response MUST contain two parts:
1. A valid JSON object containing a single key: "frameDuration". The value must be a number representing the milliseconds per frame (between 80 and 2000, per instructions above). Do not wrap the JSON in markdown backticks.
2. The ${frameCount}-frame sprite sheet image.

Example of the JSON part:
{"frameDuration": 150}
`;
};

/**
 * Builds the prompt for object detection.
 * @returns {string} The prompt for object detection.
 */
export const buildObjectDetectionPrompt = (): string => {
  return `Detect all of the prominent items in the image.
The output should be a JSON list where each item represents a detected object.
Each item must have two keys:
1. "label": a string describing the object (e.g., "cat", "hat").
2. "box_2d": a list of four numbers [ymin, xmin, ymax, xmax] representing the bounding box, normalized to 0-1000.
Do not include any text or markdown formatting outside of the JSON list.`;
};

/**
 * Builds the prompt for post-processing.
 * @param {string} effect - The effect to apply.
 * @param {number} frameCount - The number of frames in the animation.
 * @param {number} frameDuration - The duration of each frame in ms.
 * @param {object} [options] - The options for the post-processing.
 * @param {number} [options.styleIntensity] - The intensity of the style.
 * @param {string} [options.editPrompt] - The prompt for the edit.
 * @returns {string} The prompt for post-processing.
 */
export const buildPostProcessPrompt = (
  effect: string,
  frameCount: number,
  frameDuration: number,
  options?: {
    styleIntensity?: number;
    editPrompt?: string;
  }
): string => {
  const { styleIntensity, editPrompt } = options || {};
  const gridDim = Math.sqrt(frameCount);

  let effectInstruction = '';
  switch (effect) {
      case 'magic-edit':
          if (!editPrompt) {
            effectInstruction = `Redraw the sprite sheet exactly as it is, making no changes.`;
          } else {
            effectInstruction = `
            1. Analyze the provided animation sprite sheet which contains ${frameCount} frames.
            2. Your primary task is to apply a specific visual edit based on this user instruction: "${editPrompt}".
            3. This edit must be applied consistently across all ${frameCount} frames.
            4. CRITICAL: Preserve the original animation's motion perfectly. The timing and movement should be identical.
            5. CRITICAL: Maintain the subject's core identity and features across all frames. The subject must remain recognizable.
            6. CRITICAL: Only change what is explicitly requested in the edit instruction. All other aspects of the scene (background, lighting, overall style, etc.) must remain exactly the same.`;
          }
          break;
      case 'apply-style':
          let intensityDescription = '';
          if (styleIntensity && styleIntensity > 10) {
              if (styleIntensity <= 40) {
                  intensityDescription = `Your primary goal is to preserve the original animation's motion and subject identity. Secondarily, apply a subtle style transfer from the reference image, lightly influencing the color palette and texture.`;
              } else if (styleIntensity <= 70) {
                  intensityDescription = `Create a balanced mix. Redraw the animation, blending the artistic style, color palette, and texture from the reference image while preserving the original motion and subject identity.`;
              } else { // > 70
                  intensityDescription = `Aggressively adopt the style of the reference image. The style is paramount. Your task is to completely redraw the provided animation, re-imagining it in the new artistic style. The original motion must be perfectly preserved, but the subject's appearance should be fully transformed to match the reference style.`;
              }
          } else {
              // Default behavior if intensity is not provided or is low
              intensityDescription = `Create a balanced mix. Redraw the animation, blending the artistic style, color palette, and texture from the reference image while preserving the original motion and subject identity.`;
          }

          effectInstruction = `
          1. The FIRST image provided is an animation sprite sheet containing ${frameCount} frames. This is the content to be redrawn.
          2. The SECOND image provided is a style reference. This is the artistic style to be applied.
          3. Your task is to redraw the FIRST image (the sprite sheet), completely adopting the artistic style of the SECOND image (the style reference).
          4. ${intensityDescription}
          5. CRITICAL: Maintain the exact motion and timing from the original sprite sheet. The content and action of each frame must be preserved. Do NOT change the animation itself, only its visual style.
          6. CRITICAL: The style must be applied uniformly and consistently to EVERY single one of the ${frameCount} frames in the output sprite sheet. There should be no un-styled frames. Do not just overlay the style image.`;
          break;
      case 'consistency':
          effectInstruction = `
          1. Analyze all ${frameCount} frames in the provided sprite sheet.
          2. Identify the main subject.
          3. Redraw the sprite sheet, ensuring the subject's appearance (facial features, clothing, proportions, colors) remains highly consistent across all frames.
          4. Preserve the original animation's motion and story. Do NOT change the animation, only fix the visual consistency of the subject.`;
          break;
      case 'remove-bg':
          effectInstruction = `
          1. Analyze all ${frameCount} frames in the provided sprite sheet to identify the main subject(s).
          2. For each frame, perfectly isolate the main subject(s) from the background.
          3. Redraw the entire sprite sheet, placing the isolated subject(s) on a fully transparent background.
          4. It is critical to preserve the subject's original details, colors, and the animation's motion. The only change should be the removal of the background.
          5. The final output image MUST be a PNG to support transparency.`;
          break;
      case 'grayscale':
          effectInstruction = `CRITICAL DIRECTIVE: You must transform the ENTIRE scene. Every element—subjects, objects, and backgrounds—must be redrawn in the new style. Redraw the entire sprite sheet in a grayscale color palette. Maintain the existing animation and details, but convert all colors to shades of black, white, and gray.`;
          break;
      case 'vintage':
          effectInstruction = `CRITICAL DIRECTIVE: You must transform the ENTIRE scene. Every element—subjects, objects, and backgrounds—must be redrawn in the new style. Apply a vintage film effect to the entire sprite sheet. This should include a warm, sepia-toned color palette, subtle film grain, and slight vignetting. Preserve the original animation's motion.`;
          break;
      case 'neon-punk':
          effectInstruction = `CRITICAL DIRECTIVE: You must transform the ENTIRE scene. Every element—subjects, objects, and backgrounds—must be redrawn in the new style. Transform the entire scene in the sprite sheet with a neon-punk aesthetic. Re-imagine all characters, objects, and backgrounds with a dark, moody color palette. Add vibrant, glowing neon highlights and lighting effects throughout the scene, especially on edges and key features. Use pops of electric color (like magenta, cyan, and lime green). The original animation's motion must be preserved.`;
          break;
      case '8-bit':
          effectInstruction = `Your task is to convert the provided animation sprite sheet into an authentic 8-bit pixel art asset. The final result should look like it was created for a classic 1980s video game console.

CRITICAL DIRECTIVE: You must transform the ENTIRE scene. Every element—subjects, objects, and backgrounds—must be redrawn in the new style.

ARTISTIC CONSTRAINTS:
- PIXEL PERFECT: Redraw every frame on a low-resolution grid. All lines must be sharp, with hard edges. There should be NO anti-aliasing, blurring, or smooth gradients.
- LIMITED PALETTE: Strictly limit the entire color palette for the whole sprite sheet to a maximum of 16 distinct, vibrant colors, mimicking the hardware constraints of consoles like the NES or Sega Master System.
- DITHERING: Employ dithering patterns (like checkerboards) to create the illusion of additional shades and textures. This is a key technique for an authentic retro look.
- SIMPLIFICATION: Simplify complex shapes and details into clear, readable pixel sprites. The core form and action of the subject in each frame must be recognizable, but abstract away unnecessary detail.

CRITICAL RULE: The original animation's motion, timing, and subject identity must be perfectly preserved. Each frame of your output must correspond directly to a frame in the input, replicating its pose and action exactly, just translated into the 8-bit pixel art style.`;
          break;
      case 'toy-figure':
          effectInstruction = `CRITICAL DIRECTIVE: You must transform the ENTIRE scene. Every element—subjects, objects, and backgrounds—must be redrawn in the new style. Transform the scene in the sprite sheet to look like a macro photograph of miniature toy figures in a diorama.

ARTISTIC REQUIREMENTS:
- SUBJECTS & OBJECTS: Redraw all characters and items to look like they are made of painted plastic or resin, with slight imperfections common in miniatures.
- BACKGROUND & ENVIRONMENT: The entire background should look like a handcrafted, miniature set or diorama.
- CAMERA & LENS EFFECT: Apply a strong shallow depth of field effect (bokeh), where the main subject is in sharp focus and the foreground/background are artistically blurred.
- LIGHTING: The lighting should appear artificial, as if from a lamp illuminating the miniature scene.

CRITICAL RULE: The original animation's motion, timing, and the core action of each frame must be perfectly preserved. The only change should be the transformation of the entire scene into a miniature toy world.`;
          break;
      case 'ps1-style':
          effectInstruction = `Your task is to convert the provided animation sprite sheet into the style of a 3D video game from the PlayStation 1 (PS1) era.

CRITICAL DIRECTIVE: You must transform the ENTIRE scene. Every element—subjects, objects, and backgrounds—must be redrawn in the new style.

ARTISTIC REQUIREMENTS:
- GEOMETRY: Redraw all characters, objects, and background elements as low-polygon 3D models. Edges should be sharp and angular.
- TEXTURES: Apply low-resolution, pixelated textures to all surfaces. The textures should show characteristic warping and stretching, especially on moving models, just like in early 3D games.
- RENDERING: There should be absolutely no anti-aliasing or smooth shading. The lighting should be simple and basic, with flat or Gouraud shading. Some slight vertex jitter or wobbly polygons would enhance the authenticity.

CRITICAL RULE: The original animation's motion, timing, and core action must be perfectly preserved. Each frame of your output must replicate the pose and action from the input, but translated into the authentic PS1 low-poly aesthetic.`;
          break;
      default:
        effectInstruction = `Redraw the sprite sheet, but do not make any changes.`;
  }

  return `
PRIMARY GOAL: Apply a visual effect to an existing animated sprite sheet.

You are a post-processing and special effects artist. You will be given a sprite sheet and an effect to apply.

TASK:
${effectInstruction}

IMAGE OUTPUT REQUIREMENTS:
- The output MUST be a single, square image file.
- The image MUST be precisely 1024x1024 pixels.
- The image must contain ${frameCount} animation frames arranged in a ${gridDim}x${gridDim} grid.
- Do not add numbers to the frames.

REQUIRED RESPONSE FORMAT:
Your response MUST contain two parts:
1. A valid JSON object containing a single key: "frameDuration". The value must be the number ${frameDuration}. Do not wrap the JSON in markdown backticks.
2. The modified ${frameCount}-frame sprite sheet image.

Example of the JSON part:
{"frameDuration": ${frameDuration}}
`;
};

/**
 * Builds the prompt for analyzing an animation.
 * @returns {string} The prompt for analyzing an animation.
 */
export const buildAnalysisPrompt = (): string => {
  return `
PRIMARY GOAL: Analyze the motion in an animated GIF and describe it as a reusable prompt.

You are an expert in motion analysis. You will be given an animated GIF.
Your task is to describe the core action or motion in the animation in a concise, creative, and descriptive sentence.

RULES:
- The description MUST be usable as a creative prompt for an AI image generator to create a new animation.
- Focus ONLY on the movement, action, and overall mood (e.g., "a triumphant leap," "a slow, magical spin," "shaking with laughter").
- Do NOT describe the subject's appearance, clothing, species, or the background. The prompt should be generic and applicable to any subject.
- The output should be a single sentence.

Example:
- Input: A GIF of a cat jumping onto a table.
- Correct Output: "A graceful leap onto a higher surface."
- Incorrect Output: "A black cat with white paws jumps onto a wooden table."

Now, analyze the provided animation.
`;
};