/**
 * Utilitaires pour le traitement de vidéo
 * - Coupe la vidéo à 10 secondes maximum
 * - Compresse la vidéo avant l'upload
 */

/**
 * Coupe une vidéo à 10 secondes maximum et la compresse
 * @param videoFile Le fichier vidéo à traiter
 * @returns Promise<Blob> La vidéo traitée (10 secondes max, compressée)
 */
export async function processVideo(videoFile: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;
    
    const chunks: Blob[] = [];
    let mediaRecorder: MediaRecorder | null = null;
    let stream: MediaStream | null = null;
    let animationFrameId: number | null = null;

    video.onloadedmetadata = async () => {
      try {
        const maxDuration = 10; // secondes
        const duration = Math.min(video.duration, maxDuration);
        
        // Créer un canvas pour capturer la vidéo
        const canvas = document.createElement('canvas');
        const maxWidth = 1280;
        const maxHeight = 720;
        let width = video.videoWidth;
        let height = video.videoHeight;
        
        // Réduire la résolution si nécessaire
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.floor(width * ratio);
          height = Math.floor(height * ratio);
        }
        
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          reject(new Error('Impossible d\'obtenir le contexte canvas'));
          return;
        }

        // Créer un stream depuis le canvas
        stream = canvas.captureStream(30); // 30 FPS
        
        // Créer le MediaRecorder avec compression
        const options: MediaRecorderOptions = {
          mimeType: 'video/webm;codecs=vp9',
          videoBitsPerSecond: 1000000, // 1 Mbps pour compression
        };
        
        // Fallback si vp9 n'est pas supporté
        if (!MediaRecorder.isTypeSupported(options.mimeType!)) {
          options.mimeType = 'video/webm;codecs=vp8';
        }
        
        if (!MediaRecorder.isTypeSupported(options.mimeType!)) {
          options.mimeType = 'video/webm';
        }
        
        if (!MediaRecorder.isTypeSupported(options.mimeType!)) {
          options.mimeType = 'video/mp4';
        }

        mediaRecorder = new MediaRecorder(stream, options);
        
        mediaRecorder.ondataavailable = (event) => {
          if (event.data && event.data.size > 0) {
            chunks.push(event.data);
          }
        };
        
        mediaRecorder.onstop = () => {
          const blob = new Blob(chunks, { type: options.mimeType || 'video/webm' });
          // Nettoyer
          if (stream) {
            stream.getTracks().forEach(track => track.stop());
          }
          if (animationFrameId !== null) {
            cancelAnimationFrame(animationFrameId);
          }
          URL.revokeObjectURL(video.src);
          resolve(blob);
        };
        
        mediaRecorder.onerror = (error) => {
          reject(error);
        };
        
        // Démarrer l'enregistrement
        mediaRecorder.start();
        
        // Fonction pour dessiner la vidéo sur le canvas
        const drawFrame = () => {
          if (video.currentTime >= duration) {
            if (mediaRecorder && mediaRecorder.state !== 'inactive') {
              mediaRecorder.stop();
              video.pause();
            }
            return;
          }
          
          ctx.drawImage(video, 0, 0, width, height);
        };
        
        // Utiliser timeupdate pour synchroniser le dessin avec la lecture
        video.addEventListener('timeupdate', drawFrame);
        
        // Arrêter quand on atteint la durée maximale
        video.addEventListener('timeupdate', () => {
          if (video.currentTime >= duration) {
            if (mediaRecorder && mediaRecorder.state !== 'inactive') {
              mediaRecorder.stop();
              video.pause();
              video.removeEventListener('timeupdate', drawFrame);
            }
          }
        });
        
        video.currentTime = 0;
        video.play().catch((error) => {
          console.error('Erreur lors de la lecture de la vidéo:', error);
          reject(error);
        });
        
        // Arrêter après la durée maximale (sécurité)
        setTimeout(() => {
          if (mediaRecorder && mediaRecorder.state !== 'inactive') {
            mediaRecorder.stop();
            video.pause();
            video.removeEventListener('timeupdate', drawFrame);
          }
        }, duration * 1000 + 500); // +500ms de marge
        
      } catch (error) {
        reject(error);
      }
    };

    video.onerror = () => {
      URL.revokeObjectURL(video.src);
      reject(new Error('Erreur lors du chargement de la vidéo'));
    };

    video.src = URL.createObjectURL(videoFile);
  });
}

/**
 * Convertit un Blob vidéo en base64 pour l'upload
 * @param blob Le blob vidéo
 * @returns Promise<string> La vidéo en base64
 */
export async function videoBlobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Vérifie si un fichier est une vidéo
 * @param file Le fichier à vérifier
 * @returns boolean True si c'est une vidéo
 */
export function isVideoFile(file: File): boolean {
  return file.type.startsWith('video/');
}

/**
 * Vérifie la durée d'une vidéo
 * @param videoFile Le fichier vidéo
 * @returns Promise<number> La durée en secondes
 */
export function getVideoDuration(videoFile: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(video.src);
      resolve(video.duration);
    };
    
    video.onerror = () => {
      URL.revokeObjectURL(video.src);
      reject(new Error('Impossible de lire la durée de la vidéo'));
    };
    
    video.src = URL.createObjectURL(videoFile);
  });
}
