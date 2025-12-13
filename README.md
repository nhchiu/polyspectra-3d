# PolySpectra 3D - Filament Visualizer

**PolySpectra 3D** is an interactive, web-based 3D visualization tool that maps Polymaker filament products into a 3D RGB color space. It allows 3D printing enthusiasts and designers to explore, compare, and find the perfect filament colors based on their actual hex values.

## 🌟 Features

* **3D RGB Visualization**: Filaments are plotted as nodes in a 3D space where X=Red, Y=Green, and Z=Blue.
* **Dynamic Clustering**: To prevent clutter, similar colors are automatically grouped into clusters. The clustering level adapts dynamically based on your camera zoom level.
* **Smart Search & Filtering**: Filter materials by category (PLA, PETG, ABS, etc.) or search by specific color names/hex codes.
* **Interactive Details**:
  * Hover over nodes to see product details.
  * **Quick View**: Drill down into clusters to view specific filaments without leaving the 3D view.
  * Direct links to product pages.
* **Responsive Design**: optimized for both desktop and mobile viewing.
* **Theme Support**: Fully supported Light and Dark modes (syncs with system settings by default).
* **Data Export**: Export the parsed product catalog to a JSON file.

## 🛠️ Tech Stack

* **Framework**: React (Vite)
* **3D Engine**: Three.js / React Three Fiber (@react-three/fiber, @react-three/drei)
* **Styling**: Tailwind CSS
* **Icons**: Lucide React
* **Language**: TypeScript

## 🚀 Getting Started

### Prerequisites

* Node.js (v18 or higher recommended)
* npm

### Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/nhchiu/polyspectra-3d.git
   cd polyspectra-3d
   ```
2. Install dependencies:

   ```bash
   npm install
   ```

### Local Development

Start the development server:

```bash
npm run dev
```

Open your browser to `http://localhost:5173` (or the port shown in your terminal).

## 📦 Deployment

This project is configured to deploy easily to **GitHub Pages**.

### One-Command Deployment

The `package.json` includes a deploy script that builds the project and pushes it to the `gh-pages` branch.

1. Ensure your changes are committed to git.
2. Run the deploy command:
   ```bash
   npm run deploy
   ```
3. Your app will be live at `https://<your-username>.github.io/polyspectra-3d/` (it may take a minute or two to update).

### Manual Build

If you want to host it elsewhere (Netlify, Vercel, etc.):

1. Run the build command:
   ```bash
   npm run build
   ```
2. The production-ready files will be generated in the `dist/` folder.
3. Upload the contents of `dist/` to your hosting provider.

## 📂 Project Structure

* `src/components/Scene.tsx`: Main 3D scene setup (Camera, Lights, Controls).
* `src/components/FilamentNode.tsx`: Individual 3D node component representing a product or cluster.
* `src/components/InfoPanel.tsx`: The UI overlay for search, filtering, and settings.
* `src/services/geminiService.ts`: Handles fetching and parsing data from the Polymaker API.
* `src/App.tsx`: Main application logic and state management.

## 📄 License

This project is open source. Data is sourced from Polymaker's public API.
