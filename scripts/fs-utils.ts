import fs from 'node:fs';
import path from 'node:path';

/**
 * Vide un dossier de sortie SANS le supprimer.
 * Supprimer puis recréer le dossier fait perdre sa trace au serveur de dev Vite (la liste des fichiers
 * de public/ n'est plus mise à jour) : les nouveaux fichiers sont alors servis comme une page HTML.
 */
export function emptyDir(dir: string): void {
  fs.mkdirSync(dir, { recursive: true });
  for (const name of fs.readdirSync(dir)) fs.rmSync(path.join(dir, name), { recursive: true, force: true });
}
