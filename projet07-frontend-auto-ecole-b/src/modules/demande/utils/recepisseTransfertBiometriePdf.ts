import { jsPDF } from 'jspdf';
import { fetchDocumentAsBlob } from '../../reception/traitement-dossier/utils/documentHandlers';

/** Libelles contenant "photo" pour retrouver la piece d'identite. */
export function trouverPieceEtiqueteePhoto<T extends { libelle?: string; typeDocument?: string }>(
  pieces: readonly T[],
): T | null {
  for (const p of pieces) {
    const lib = normalize(p.libelle ?? '');
    const td = normalize(p.typeDocument ?? '');
    if (lib.includes('photo') || td.includes('photo')) return p;
  }
  return null;
}

function normalize(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '').trim();
}

async function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result ?? ''));
    r.onerror = reject;
    r.readAsDataURL(blob);
  });
}

async function loadAssetDataUrl(assetUrl: string): Promise<string | null> {
  try {
    const res = await fetch(assetUrl, { method: 'GET' });
    if (!res.ok) return null;
    const blob = await res.blob();
    if (!blob || blob.size === 0) return null;
    return await blobToDataUrl(blob);
  } catch {
    return null;
  }
}

function drawKv(
  pdf: jsPDF,
  key: string,
  value: string,
  x: number,
  y: number,
  maxWidth: number,
  lineStep: number,
): number {
  const v = value && value.trim() ? value : '-';
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8);
  pdf.text(`${key}:`, x, y);
  pdf.setFont('helvetica', 'normal');
  const wrapped = pdf.splitTextToSize(v, maxWidth - 28) as string[];
  pdf.text(wrapped, x + 28, y);
  return y + Math.max(1, wrapped.length) * lineStep;
}

function drawSectionHeader(pdf: jsPDF, title: string, x: number, y: number, w: number): number {
  void w;
  pdf.setTextColor(0, 0, 0);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8.4);
  pdf.text(title.toUpperCase(), x, y + 3.2);
  pdf.setFont('helvetica', 'normal');
  return y + 5.2;
}

function drawFieldRow(
  pdf: jsPDF,
  key: string,
  value: string,
  x: number,
  y: number,
  w: number,
  keyWOverride?: number,
): number {
  const v = value && value.trim() ? value : '-';
  const keyW = keyWOverride ?? 28;
  const valW = w - keyW;
  const valLines = pdf.splitTextToSize(v, valW) as string[];
  const rowH = Math.max(3.8, valLines.length * 2.8);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(7.3);
  pdf.setTextColor(0, 0, 0);
  pdf.text(`${key}:`, x, y + 2.7);
  pdf.setFont('helvetica', 'normal');
  pdf.text(valLines, x + keyW, y + 2.7);
  return y + rowH + 0.8;
}

export interface DonneesRecepisseTransfertBiometrie {
  dossierId: string;
  dateTransfert: Date;
  typeDemandeNom: string;
  personne?: {
    nom?: string;
    prenom?: string;
    nomCompletAffiche?: string;
    email?: string;
    contact?: string;
    adresse?: string;
    date_naissance?: string;
    lieu_naissance?: string;
    nationalite?: string;
    genre?: string;
    type_piece?: string;
    numero_piece?: string;
    nip?: string;
    numero_candidat?: string;
  };
  permis?: {
    numero?: string;
    numero_origine?: string;
    categorie?: string;
    lieu_obtention?: string;
    date_obtention?: string;
    date_validite?: string;
  };
  allPermisDuDossier?: Array<{
    categorie?: string;
    numero?: string;
    lieu_obtention?: string;
    date_obtention?: string;
    date_validite?: string;
  }> | unknown[];
  dossierLieux?: {
    autoEcoleNom?: string;
    formationResume?: string;
    referencielLibelle?: string;
    province?: string;
    centre?: string;
    commentaires?: string;
    isNouveauPermis?: boolean;
  };
  documentPhotoPourRecepisse?: unknown | null;
}

/**
 * Recepisse gouvernemental compact sur une page A4.
 */
export async function telechargerRecepisseTransfertBiometriePdf(input: DonneesRecepisseTransfertBiometrie): Promise<void> {
  const pdf = new jsPDF({ unit: 'mm', format: 'a4', compress: true });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const marg = 9;

  const mttDataUrl = await loadAssetDataUrl('/assets/img/mtt.png');
  const setOpacity = (value: number) => {
    const g = pdf as unknown as {
      GState?: new (v: { opacity: number }) => unknown;
      setGState?: (gstate: unknown) => void;
    };
    if (g.GState && g.setGState) g.setGState(new g.GState({ opacity: value }));
  };
  if (mttDataUrl) {
    try {
      setOpacity(0.05);
      pdf.addImage(mttDataUrl, 'PNG', 53, 75, 104, 104);
      setOpacity(1);
    } catch {
      // ignore watermark rendering issues
    }
  }

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(9.6);
  pdf.setTextColor(0, 0, 0);
  pdf.text('MINISTERE DES TRANSPORTS, DE LA MARINE MARCHANDE ET DE LA LOGISTIQUE', pageW / 2, 20.7, { align: 'center' });

  pdf.setFontSize(12.2);
  pdf.text('RECEPISSE DE TRANSMISSION BIOMETRIQUE (CNEDDT)', marg, 30);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(7.4);
  pdf.setTextColor(0, 0, 0);
  pdf.text('Document officiel a joindre au dossier physique pour verification avant parametrage biometrique.', marg, 33.7);
  pdf.setTextColor(0, 0, 0);

  // Photo en haut a droite.
  const photoX = pageW - 42;
  const photoY = 24.8;
  const photoW = 28;
  const photoH = 34;
  pdf.setFontSize(7);
  pdf.setTextColor(0, 0, 0);

  const photoDoc = input.documentPhotoPourRecepisse as { id?: string } | null | undefined;
  if (photoDoc?.id) {
    try {
      const fetched = await fetchDocumentAsBlob(photoDoc);
      if (fetched && /^image\//i.test(fetched.contentType)) {
        const dataUrl = await blobToDataUrl(fetched.blob);
        const format = dataUrl.startsWith('data:image/png') ? 'PNG' : 'JPEG';
        pdf.addImage(dataUrl, format, photoX + 0.8, photoY + 0.8, photoW - 1.6, photoH - 1.6);
      } else {
        pdf.setFontSize(6.5);
        pdf.text('Document photo non image', photoX + photoW / 2, photoY + photoH / 2, { align: 'center' });
      }
    } catch {
      pdf.setFontSize(6.5);
      pdf.text('Photo indisponible', photoX + photoW / 2, photoY + photoH / 2, { align: 'center' });
    }
  } else {
    pdf.setFontSize(6.5);
    pdf.text('Aucune piece "photo"', photoX + photoW / 2, photoY + photoH / 2, { align: 'center' });
  }

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(7.5);
  const dateFmt = input.dateTransfert.toLocaleString('fr-FR', { dateStyle: 'long', timeStyle: 'short' });
  const infoY = 37.5;
  const infoW = pageW - marg * 2;
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(7.6);
  pdf.text('Reference dossier', marg + 2, infoY + 4.3);
  pdf.text('Type de demande', marg + 2, infoY + 8.7);
  pdf.text('Date / Heure de transmission', marg + 2, infoY + 13.1);
  pdf.setFont('helvetica', 'normal');
  pdf.text(input.dossierId || '-', marg + 45, infoY + 4.3);
  pdf.text(input.typeDemandeNom || '-', marg + 45, infoY + 8.7);
  pdf.text(dateFmt, marg + 45, infoY + 13.1);

  const gap = 3.3;
  const colX = marg;
  const colY = 56.5;
  const colH = 206;
  const leftW = (pageW - marg * 2 - gap) * 0.58;
  const rightW = pageW - marg * 2 - gap - leftW;
  const rightX = colX + leftW + gap;

  let leftY = colY + 2.4;
  let rightY = colY + 2.4;
  const p = input.personne ?? {};
  const m = input.permis ?? {};
  const l = input.dossierLieux ?? {};

  leftY = drawSectionHeader(pdf, 'Informations personnelles usager', colX + 2.1, leftY, leftW - 4.2);
  leftY = drawFieldRow(pdf, 'Nom', p.nom ?? '', colX + 2.1, leftY, leftW - 4.2);
  leftY = drawFieldRow(pdf, 'Prenom', p.prenom ?? '', colX + 2.1, leftY, leftW - 4.2);
  leftY = drawFieldRow(pdf, 'Nom complet', p.nomCompletAffiche ?? '', colX + 2.1, leftY, leftW - 4.2);
  leftY = drawFieldRow(pdf, 'Numero candidat', p.numero_candidat ?? '', colX + 2.1, leftY, leftW - 4.2);
  leftY = drawFieldRow(pdf, 'Date de naissance', p.date_naissance ?? '', colX + 2.1, leftY, leftW - 4.2);
  leftY = drawFieldRow(pdf, 'Lieu de naissance', p.lieu_naissance ?? '', colX + 2.1, leftY, leftW - 4.2);
  leftY = drawFieldRow(pdf, 'Nationalite', p.nationalite ?? '', colX + 2.1, leftY, leftW - 4.2);
  leftY = drawFieldRow(pdf, 'Genre', p.genre ?? '', colX + 2.1, leftY, leftW - 4.2);
  leftY = drawFieldRow(pdf, 'Type piece', p.type_piece ?? '', colX + 2.1, leftY, leftW - 4.2);
  leftY = drawFieldRow(pdf, 'Numero piece', p.numero_piece ?? '', colX + 2.1, leftY, leftW - 4.2);
  leftY = drawFieldRow(pdf, 'Email', p.email ?? '', colX + 2.1, leftY, leftW - 4.2);
  leftY = drawFieldRow(pdf, 'Contact', p.contact ?? '', colX + 2.1, leftY, leftW - 4.2);
  leftY = drawFieldRow(pdf, 'Adresse', p.adresse ?? '', colX + 2.1, leftY, leftW - 4.2);

  rightY = drawSectionHeader(pdf, 'Informations permis de conduire', rightX + 2.1, rightY, rightW - 4.2);
  rightY = drawFieldRow(pdf, 'Categorie', m.categorie ?? '', rightX + 2.1, rightY, rightW - 4.2, 34);
  rightY = drawFieldRow(pdf, 'Numero permis', m.numero ?? '', rightX + 2.1, rightY, rightW - 4.2, 34);
  rightY = drawFieldRow(pdf, "Numero permis d'origine", m.numero_origine ?? '', rightX + 2.1, rightY, rightW - 4.2, 34);
  rightY = drawFieldRow(pdf, 'Lieu obtention', m.lieu_obtention ?? '', rightX + 2.1, rightY, rightW - 4.2, 34);
  rightY = drawFieldRow(pdf, 'Date obtention', m.date_obtention ?? '', rightX + 2.1, rightY, rightW - 4.2, 34);
  rightY = drawFieldRow(pdf, 'Date validite', m.date_validite ?? '', rightX + 2.1, rightY, rightW - 4.2, 34);
  rightY = drawFieldRow(
    pdf,
    'Contexte',
    l.isNouveauPermis ? 'Nouveau permis / formation associee' : 'Permis existant (changement ou autre)',
    rightX + 2.1,
    rightY,
    rightW - 4.2,
  );
  const allPermisRaw = input.allPermisDuDossier ?? [];
  const allPermis = (allPermisRaw as unknown[]).map((entry) => {
    if (typeof entry === 'string') {
      const s = entry.trim();
      if (s && !s.startsWith('{') && !s.startsWith('[')) {
        return {
          categorie: s,
          numero: '-',
          lieu_obtention: '-',
          date_obtention: '-',
          date_validite: '-',
        };
      }
      try {
        const parsed = JSON.parse(s) as Record<string, unknown>;
        return {
          categorie: String(parsed.classe ?? parsed.categorie ?? ''),
          numero: String(parsed.codification_code ?? parsed.numero_permis ?? ''),
          lieu_obtention: String(parsed.ville ?? parsed.lieu_obtention ?? ''),
          date_obtention: String(parsed.valable_du ?? parsed.date_obtention ?? ''),
          date_validite: String(parsed.jusqu_au ?? parsed.date_validite ?? ''),
        };
      } catch {
        return { categorie: '', numero: String(entry), lieu_obtention: '', date_obtention: '', date_validite: '' };
      }
    }
    const obj = entry as Record<string, unknown>;
    return {
      categorie: String(obj.categorie ?? obj.classe ?? ''),
      numero: String(obj.numero ?? obj.numero_permis ?? obj.codification_code ?? ''),
      lieu_obtention: String(obj.lieu_obtention ?? obj.ville ?? ''),
      date_obtention: String(obj.date_obtention ?? obj.valable_du ?? ''),
      date_validite: String(obj.date_validite ?? obj.jusqu_au ?? ''),
    };
  });
  if (allPermis.length > 0) {
    rightY = drawFieldRow(pdf, 'Tous permis (data_categorie)', '', rightX + 2.1, rightY, rightW - 4.2);
    allPermis.forEach((p, idx) => {
      const head = `Permis ${idx + 1}`;
      const cat = (p.categorie ?? '-').trim() || '-';
      const num = (p.numero ?? '-').trim() || '-';
      const lieu = (p.lieu_obtention ?? '-').trim() || '-';
      const dd = (p.date_obtention ?? '-').trim() || '-';
      const dv = (p.date_validite ?? '-').trim() || '-';
      rightY = drawFieldRow(pdf, `${head} cat`, cat, rightX + 2.1, rightY, rightW - 4.2);
      rightY = drawFieldRow(pdf, `${head} numero`, num, rightX + 2.1, rightY, rightW - 4.2);
      rightY = drawFieldRow(pdf, `${head} lieu`, lieu, rightX + 2.1, rightY, rightW - 4.2);
      rightY = drawFieldRow(pdf, `${head} obtention`, dd, rightX + 2.1, rightY, rightW - 4.2);
      rightY = drawFieldRow(pdf, `${head} validite`, dv, rightX + 2.1, rightY, rightW - 4.2);
      rightY += 1.2;
    });
  }

  rightY += 1;
  rightY = drawSectionHeader(pdf, 'Rattachement du dossier', rightX + 2.1, rightY, rightW - 4.2);
  rightY = drawFieldRow(pdf, 'Auto-ecole', l.autoEcoleNom ?? '', rightX + 2.1, rightY, rightW - 4.2);
  rightY = drawFieldRow(pdf, 'Formation', l.formationResume ?? '', rightX + 2.1, rightY, rightW - 4.2);
  rightY = drawFieldRow(pdf, 'Referenciel', l.referencielLibelle ?? '', rightX + 2.1, rightY, rightW - 4.2);
  rightY = drawFieldRow(pdf, 'Province', l.province ?? '', rightX + 2.1, rightY, rightW - 4.2);
  rightY = drawFieldRow(pdf, 'Centre', l.centre ?? '', rightX + 2.1, rightY, rightW - 4.2);
  rightY = drawFieldRow(pdf, 'Commentaires', l.commentaires ?? '', rightX + 2.1, rightY, rightW - 4.2);

  // Filigrane/logo au premier plan pour rester visible meme sur le bloc d'informations.
  if (mttDataUrl) {
    try {
      setOpacity(0.16);
      pdf.addImage(mttDataUrl, 'PNG', 55, 28, 102, 102);
      setOpacity(1);
    } catch {
      // ignore
    }
  }

  const footerY = pageH - 12;
  pdf.setFont('helvetica', 'italic');
  pdf.setFontSize(7.5);
  pdf.setTextColor(70, 70, 70);
  pdf.text(
    "Recepisse a faire verifier par l'usager avant la prise des parametres biometriques. A classer au dossier physique.",
    marg,
    footerY,
    { maxWidth: pageW - marg * 2 },
  );

  const safeName = `recepisse-transmission-CNEDDT-${input.dossierId.slice(0, 8)}.pdf`;
  pdf.save(safeName);
}
