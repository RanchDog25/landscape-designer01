import { GlobalWorkerOptions } from "pdfjs-dist";

// Use CDN worker that matches the exact version
const workerUrl = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.8.69/pdf.worker.min.js`;
GlobalWorkerOptions.workerSrc = workerUrl;

console.log("[PDF Worker] Initialized with worker source:", workerUrl);
