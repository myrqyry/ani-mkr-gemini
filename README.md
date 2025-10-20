<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Banamimator

Banamimator is a web-based application that allows you to create animations from images and text prompts. It uses the Gemini API to generate sprite sheets, which are then animated in the browser.

## Features

- **Animate from Text:** Create animations from a text prompt.
- **Animate from Image:** Use an image as a starting point for your animation.
- **Style Transfer:** Apply the style of one image to your animation.
- **Motion Extraction:** Extract the motion from a GIF and apply it to your animation.
- **Post-Processing Effects:** Apply various effects to your animations, such as improving consistency, removing the background, and more.
- **Export:** Export your animations as GIFs, MP4s, or PNG sequences.
- **Customizable Themes:** Customize the look and feel of the application.

## Run Locally

**Prerequisites:**

- Node.js
- npm

**Setup:**

1. **Clone the repository:**
   ```bash
   git clone https://github.com/google/codewithme-media-tutor.git
   ```
2. **Install dependencies:**
   ```bash
   npm install
   ```
3. **Set up your environment variables:**
   - Copy the `.env.example` file to a new file named `.env.local`:
     ```bash
     cp .env.example .env.local
     ```
   - Open `.env.local` and add your Gemini API key. You can get one from the [AI Studio](https://aistudio.google.com/apikey).
     ```
     GEMINI_API_KEY=your_api_key
     ```
4. **Run the development server:**
   ```bash
   npm run dev
   ```
5. **Open your browser and navigate to `http://localhost:3000`**

## Usage

1. **Enter a prompt:** Type a description of the animation you want to create in the text area.
2. **(Optional) Add an image:** You can upload an image, use your camera, or paste a URL to use as a starting point for your animation.
3. **(Optional) Add a style image:** You can upload a style image to apply its style to your animation.
4. **(Optional) Extract motion from a GIF:** You can upload a GIF to extract its motion and apply it to your animation.
5. **Click "Bananimate":** The application will generate a sprite sheet and display the animation.
6. **(Optional) Apply post-processing effects:** You can apply various effects to your animation, such as improving consistency, removing the background, and more.
7. **Export your animation:** You can export your animation as a GIF, MP4, or PNG sequence.

## Project Structure

- `src/`: Contains the source code for the application.
  - `components/`: Contains the React components.
  - `constants/`: Contains the constants used in the application.
  - `hooks/`: Contains the custom React hooks.
  - `reducers/`: Contains the app reducer.
  - `services/`: Contains the services for interacting with the Gemini API.
  - `types/`: Contains the TypeScript types.
  - `utils/`: Contains the utility functions.
- `App.tsx`: The main App component.
- `server.js`: The backend server for proxying requests to the Gemini API.
- `prompts.ts`: Contains the prompts for the Gemini API.
- `index.html`: The main HTML file.
- `README.md`: This file.
