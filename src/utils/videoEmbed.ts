/**
 * Video Hosting and Embed Utilities
 * Disallows direct video uploads (to prevent storage and bandwidth costs),
 * and parses YouTube, Loom, and Vimeo URLs into responsive iframe embeds.
 */

export interface ParsedVideoEmbed {
  isValid: boolean;
  provider: 'youtube' | 'loom' | 'vimeo' | 'unknown';
  embedUrl: string;
  originalUrl: string;
  title?: string;
}

/**
 * Checks if a file or URL is a direct raw video file (.mp4, .mov, .webm, etc.)
 */
export const isDirectVideoFile = (fileOrUrl: string | File): boolean => {
  if (typeof fileOrUrl !== 'string') {
    return fileOrUrl.type.startsWith('video/') || /\.(mp4|mov|avi|mkv|webm|m4v|wmv|flv)$/i.test(fileOrUrl.name);
  }
  const cleanUrl = fileOrUrl.split('?')[0].toLowerCase();
  return /\.(mp4|mov|avi|mkv|webm|m4v|wmv|flv)$/i.test(cleanUrl);
};

/**
 * Parses user input video URLs (YouTube, Loom, Vimeo) into sanitized embed URLs
 */
export const parseVideoEmbed = (url: string): ParsedVideoEmbed => {
  if (!url || typeof url !== 'string') {
    return { isValid: false, provider: 'unknown', embedUrl: '', originalUrl: url || '' };
  }

  const trimmed = url.trim();

  // 1. YouTube: Matches youtube.com/watch?v=..., youtu.be/..., youtube.com/embed/..., youtube.com/shorts/...
  const ytMatch = trimmed.match(
    /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|v\/|shorts\/)|youtu\.be\/)([\w-]{11})/i
  );
  if (ytMatch && ytMatch[1]) {
    return {
      isValid: true,
      provider: 'youtube',
      embedUrl: `https://www.youtube-nocookie.com/embed/${ytMatch[1]}?rel=0&modestbranding=1`,
      originalUrl: trimmed,
      title: 'YouTube Video',
    };
  }

  // 2. Loom: Matches loom.com/share/... or loom.com/embed/...
  const loomMatch = trimmed.match(
    /(?:https?:\/\/)?(?:www\.)?loom\.com\/(?:share|embed)\/([a-zA-Z0-9_-]+)/i
  );
  if (loomMatch && loomMatch[1]) {
    return {
      isValid: true,
      provider: 'loom',
      embedUrl: `https://www.loom.com/embed/${loomMatch[1]}`,
      originalUrl: trimmed,
      title: 'Loom Recording',
    };
  }

  // 3. Vimeo: Matches vimeo.com/... or player.vimeo.com/video/...
  const vimeoMatch = trimmed.match(
    /(?:https?:\/\/)?(?:www\.|player\.)?vimeo\.com\/(?:video\/)?([0-9]+)/i
  );
  if (vimeoMatch && vimeoMatch[1]) {
    return {
      isValid: true,
      provider: 'vimeo',
      embedUrl: `https://player.vimeo.com/video/${vimeoMatch[1]}?title=0&byline=0&portrait=0`,
      originalUrl: trimmed,
      title: 'Vimeo Video',
    };
  }

  // Check if it's an existing iframe or embed url
  if (trimmed.startsWith('https://') && (trimmed.includes('/embed/') || trimmed.includes('player.'))) {
    return {
      isValid: true,
      provider: 'unknown',
      embedUrl: trimmed,
      originalUrl: trimmed,
      title: 'Video Embed',
    };
  }

  return {
    isValid: false,
    provider: 'unknown',
    embedUrl: '',
    originalUrl: trimmed,
  };
};
