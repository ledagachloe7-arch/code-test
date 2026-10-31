<?php

// @formatter:off
// phpcs:ignoreFile
/**
 * A helper file for your Eloquent Models
 * Copy the phpDocs from this file to the correct Model,
 * And remove them from this file, to prevent double declarations.
 *
 * @author Barry vd. Heuvel <barryvdh@gmail.com>
 */


namespace App\Models{
/**
 * @property string $id
 * @property string $personne_id
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property-read \App\Models\Personne $personne
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Administrateur newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Administrateur newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Administrateur query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Administrateur whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Administrateur whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Administrateur wherePersonneId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Administrateur whereUpdatedAt($value)
 */
	class Administrateur extends \Eloquent {}
}

namespace App\Models{
/**
 * @property string $id
 * @property string $nom_auto_ecole
 * @property string|null $adresse
 * @property string $email
 * @property string $responsable_id
 * @property string $contact
 * @property bool $statut
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property string|null $province_id
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\Dossier> $dossiers
 * @property-read int|null $dossiers_count
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\FormationAutoEcole> $formations
 * @property-read int|null $formations_count
 * @property-read \App\Models\Referentiel|null $province
 * @property-read \App\Models\Personne $responsable
 * @method static \Illuminate\Database\Eloquent\Builder<static>|AutoEcole newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|AutoEcole newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|AutoEcole query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|AutoEcole whereAdresse($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|AutoEcole whereContact($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|AutoEcole whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|AutoEcole whereEmail($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|AutoEcole whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|AutoEcole whereNomAutoEcole($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|AutoEcole whereProvinceId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|AutoEcole whereResponsableId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|AutoEcole whereStatut($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|AutoEcole whereUpdatedAt($value)
 */
	class AutoEcole extends \Eloquent {}
}

namespace App\Models{
/**
 * @property string $id
 * @property string $personne_id
 * @property string $numero_candidat
 * @property \Illuminate\Support\Carbon $date_naissance
 * @property string $lieu_naissance
 * @property string $nip
 * @property string $type_piece
 * @property string $numero_piece
 * @property string $nationalite
 * @property string $genre
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\Document> $documents
 * @property-read int|null $documents_count
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\Dossier> $dossiers
 * @property-read int|null $dossiers_count
 * @property-read \App\Models\Personne $personne
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Candidat byPersonne($personneId)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Candidat newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Candidat newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Candidat query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Candidat whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Candidat whereDateNaissance($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Candidat whereGenre($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Candidat whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Candidat whereLieuNaissance($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Candidat whereNationalite($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Candidat whereNip($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Candidat whereNumeroCandidat($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Candidat whereNumeroPiece($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Candidat wherePersonneId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Candidat whereTypePiece($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Candidat whereUpdatedAt($value)
 */
	class Candidat extends \Eloquent {}
}

namespace App\Models{
/**
 * @property string $id
 * @property string|null $numero_permis
 * @property string|null $numero_identite
 * @property string|null $nom
 * @property string|null $prenom
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @method static \Illuminate\Database\Eloquent\Builder<static>|ChangePermis newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|ChangePermis newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|ChangePermis query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|ChangePermis whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|ChangePermis whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|ChangePermis whereNom($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|ChangePermis whereNumeroIdentite($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|ChangePermis whereNumeroPermis($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|ChangePermis wherePrenom($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|ChangePermis whereUpdatedAt($value)
 */
	class ChangePermis extends \Eloquent {}
}

namespace App\Models{
/**
 * @property string $id
 * @property string $libelle
 * @property bool $actif
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property string|null $nom_entite
 * @property string|null $type_permis
 * @property string|null $nationalite
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\Etape> $etapes
 * @property-read int|null $etapes_count
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\JournalTransition> $journauxTransitions
 * @property-read int|null $journaux_transitions_count
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\Transition> $transitions
 * @property-read int|null $transitions_count
 * @method static \Database\Factories\CircuitFactory factory($count = null, $state = [])
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Circuit newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Circuit newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Circuit query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Circuit whereActif($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Circuit whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Circuit whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Circuit whereLibelle($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Circuit whereNationalite($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Circuit whereNomEntite($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Circuit whereTypePermis($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Circuit whereUpdatedAt($value)
 */
	class Circuit extends \Eloquent {}
}

namespace App\Models{
/**
 * @property string $id
 * @property string $nom_fichier
 * @property string $chemin_fichier
 * @property string $type_mime
 * @property int $taille_fichier
 * @property bool $valide
 * @property string|null $commentaires
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property string $documentable_type
 * @property string|null $documentable_id
 * @property string|null $piece_justification_id
 * @property string|null $node_id_alfresco
 * @property-read \Illuminate\Database\Eloquent\Model|\Eloquent|null $documentable
 * @property-read \App\Models\PieceJustificative|null $pieceJustificatif
 * @property-read \App\Models\Referentiel|null $typeDocument
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Document newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Document newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Document query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Document whereCheminFichier($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Document whereCommentaires($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Document whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Document whereDocumentableId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Document whereDocumentableType($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Document whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Document whereNodeIdAlfresco($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Document whereNomFichier($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Document wherePieceJustificationId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Document whereTailleFichier($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Document whereTypeMime($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Document whereUpdatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Document whereValide($value)
 */
	class Document extends \Eloquent {}
}

namespace App\Models{
/**
 * @property string $id
 * @property string|null $candidat_id
 * @property string|null $auto_ecole_id
 * @property string|null $formation_id
 * @property string $statut
 * @property array<array-key, mixed>|null $commentaires
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property string|null $type_demande_id
 * @property string|null $referenciel_id
 * @property string|null $numero_permis
 * @property string|null $numero_origine_permis
 * @property string|null $date_de_delivrance_du_permis
 * @property string|null $date_de_dobtention_du_permis
 * @property string|null $lieu_de_dobtention_du_permis
 * @property string|null $date_expiration
 * @property string|null $code_paiement
 * @property string|null $numero
 * @property-read \App\Models\AutoEcole|null $autoEcole
 * @property-read \App\Models\Candidat|null $candidat
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\Document> $documents
 * @property-read int|null $documents_count
 * @property-read \App\Models\FormationAutoEcole|null $formation
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\Paiement> $paiements
 * @property-read int|null $paiements_count
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\ProgrammeSession> $programmeSessions
 * @property-read int|null $programme_sessions_count
 * @property-read \App\Models\Referentiel|null $referentiel
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\Resultat> $resultats
 * @property-read int|null $resultats_count
 * @property-read \App\Models\TypeDemande|null $typeDemande
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Dossier byStatus($status)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Dossier newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Dossier newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Dossier query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Dossier whereAutoEcoleId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Dossier whereCandidatId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Dossier whereCodePaiement($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Dossier whereCommentaires($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Dossier whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Dossier whereDateDeDelivranceDuPermis($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Dossier whereDateDeDobtentionDuPermis($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Dossier whereDateExpiration($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Dossier whereFormationId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Dossier whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Dossier whereLieuDeDobtentionDuPermis($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Dossier whereNumero($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Dossier whereNumeroOriginePermis($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Dossier whereNumeroPermis($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Dossier whereReferencielId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Dossier whereStatut($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Dossier whereTypeDemandeId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Dossier whereUpdatedAt($value)
 */
	class Dossier extends \Eloquent {}
}

namespace App\Models{
/**
 * @property string $id
 * @property string $code
 * @property string $libelle
 * @property array<array-key, mixed> $roles
 * @property string $statut_libelle
 * @property string $circuit_id
 * @property string $statut_id
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property \Illuminate\Database\Eloquent\Collection<int, \App\Models\PieceJustificative> $pieces
 * @property-read \App\Models\Circuit $circuit
 * @property-read int|null $pieces_count
 * @property-read \App\Models\Statut $statut
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\Transition> $transitionEntrante
 * @property-read int|null $transition_entrante_count
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\Transition> $transitionSortante
 * @property-read int|null $transition_sortante_count
 * @method static \Database\Factories\EtapeFactory factory($count = null, $state = [])
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Etape newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Etape newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Etape query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Etape whereCircuitId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Etape whereCode($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Etape whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Etape whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Etape whereLibelle($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Etape wherePieces($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Etape whereRoles($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Etape whereStatutId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Etape whereStatutLibelle($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Etape whereUpdatedAt($value)
 */
	class Etape extends \Eloquent {}
}

namespace App\Models{
/**
 * @property string $id
 * @property string $auto_ecole_id
 * @property string $type_permis_id
 * @property numeric $montant
 * @property string|null $description
 * @property string $session_id
 * @property bool $statut
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property-read \App\Models\AutoEcole $autoEcole
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\Dossier> $dossiers
 * @property-read int|null $dossiers_count
 * @property-read \App\Models\Referentiel $session
 * @property-read \App\Models\Referentiel $typePermis
 * @method static \Illuminate\Database\Eloquent\Builder<static>|FormationAutoEcole newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|FormationAutoEcole newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|FormationAutoEcole query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|FormationAutoEcole whereAutoEcoleId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|FormationAutoEcole whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|FormationAutoEcole whereDescription($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|FormationAutoEcole whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|FormationAutoEcole whereMontant($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|FormationAutoEcole whereSessionId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|FormationAutoEcole whereStatut($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|FormationAutoEcole whereTypePermisId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|FormationAutoEcole whereUpdatedAt($value)
 */
	class FormationAutoEcole extends \Eloquent {}
}

namespace App\Models{
/**
 * @property string|null $numero_identite
 * @property string $nom
 * @property string|null $prenom
 * @property string|null $sexe
 * @property string|null $nationalite
 * @property string|null $date_naissance
 * @property string|null $lieu_naissance
 * @property string|null $numero_permis
 * @property string|null $type_permis
 * @property string|null $categorie
 * @property string|null $date_obtention
 * @property string|null $lieu_obtention
 * @property string|null $date_validite
 * @property string|null $numero_origine_permis
 * @property string|null $lieu_origine
 * @property string|null $date_renou1
 * @property string|null $date_renou2
 * @property string|null $date_renou3
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property string $id
 * @method static \Illuminate\Database\Eloquent\Builder<static>|HEPermis newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|HEPermis newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|HEPermis query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|HEPermis whereCategorie($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|HEPermis whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|HEPermis whereDateNaissance($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|HEPermis whereDateObtention($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|HEPermis whereDateRenou1($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|HEPermis whereDateRenou2($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|HEPermis whereDateRenou3($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|HEPermis whereDateValidite($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|HEPermis whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|HEPermis whereLieuNaissance($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|HEPermis whereLieuObtention($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|HEPermis whereLieuOrigine($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|HEPermis whereNationalite($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|HEPermis whereNom($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|HEPermis whereNumeroIdentite($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|HEPermis whereNumeroOriginePermis($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|HEPermis whereNumeroPermis($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|HEPermis wherePrenom($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|HEPermis whereSexe($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|HEPermis whereTypePermis($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|HEPermis whereUpdatedAt($value)
 */
	class HEPermis extends \Eloquent {}
}

namespace App\Models{
/**
 * @property string $id
 * @property string|null $numero_identite
 * @property string $nom
 * @property string|null $prenom
 * @property string|null $sexe
 * @property string|null $nationalite
 * @property string|null $date_naissance
 * @property string|null $lieu_naissance
 * @property string|null $numero_permis
 * @property string|null $type_permis
 * @property string|null $categorie
 * @property string|null $date_obtention
 * @property string|null $lieu_obtention
 * @property string|null $date_validite
 * @property string|null $numero_origine_permis
 * @property string|null $lieu_origine
 * @property string|null $date_renou1
 * @property string|null $date_renou2
 * @property string|null $date_renou3
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @method static \Illuminate\Database\Eloquent\Builder<static>|HPermis newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|HPermis newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|HPermis query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|HPermis whereCategorie($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|HPermis whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|HPermis whereDateNaissance($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|HPermis whereDateObtention($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|HPermis whereDateRenou1($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|HPermis whereDateRenou2($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|HPermis whereDateRenou3($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|HPermis whereDateValidite($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|HPermis whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|HPermis whereLieuNaissance($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|HPermis whereLieuObtention($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|HPermis whereLieuOrigine($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|HPermis whereNationalite($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|HPermis whereNom($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|HPermis whereNumeroIdentite($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|HPermis whereNumeroOriginePermis($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|HPermis whereNumeroPermis($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|HPermis wherePrenom($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|HPermis whereSexe($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|HPermis whereTypePermis($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|HPermis whereUpdatedAt($value)
 */
	class HPermis extends \Eloquent {}
}

namespace App\Models{
/**
 * @property-read \App\Models\Etape|null $etape
 * @property-read \App\Models\Role|null $role
 * @method static \Illuminate\Database\Eloquent\Builder<static>|HabilitationEtape newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|HabilitationEtape newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|HabilitationEtape query()
 */
	class HabilitationEtape extends \Eloquent {}
}

namespace App\Models{
/**
 * @property string $id
 * @property string|null $transition_id
 * @property string $circuit_id
 * @property string $circuit_libelle
 * @property \Illuminate\Support\Carbon $date_heure
 * @property string $auteur
 * @property string $transition_libelle
 * @property string|null $commentaire
 * @property \App\Models\ResultatTransition $resultat
 * @property string $statut_depart
 * @property string $statut_cible
 * @property string $transition_code
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property-read \App\Models\Circuit $circuit
 * @property-read \App\Models\Transition|null $transition
 * @method static \Database\Factories\JournalTransitionFactory factory($count = null, $state = [])
 * @method static \Illuminate\Database\Eloquent\Builder<static>|JournalTransition newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|JournalTransition newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|JournalTransition query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|JournalTransition whereAuteur($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|JournalTransition whereCircuitId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|JournalTransition whereCircuitLibelle($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|JournalTransition whereCommentaire($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|JournalTransition whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|JournalTransition whereDateHeure($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|JournalTransition whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|JournalTransition whereResultat($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|JournalTransition whereStatutCible($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|JournalTransition whereStatutDepart($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|JournalTransition whereTransitionCode($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|JournalTransition whereTransitionId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|JournalTransition whereTransitionLibelle($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|JournalTransition whereUpdatedAt($value)
 */
	class JournalTransition extends \Eloquent {}
}

namespace App\Models{
/**
 * @property string $id
 * @property string $dossier_id
 * @property string $code_paiement
 * @property string $reference_paiement
 * @property numeric $montant
 * @property string $nom
 * @property string $prenom
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property-read \App\Models\Dossier $dossier
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Paiement newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Paiement newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Paiement query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Paiement whereCodePaiement($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Paiement whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Paiement whereDossierId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Paiement whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Paiement whereMontant($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Paiement whereNom($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Paiement wherePrenom($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Paiement whereReferencePaiement($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Paiement whereUpdatedAt($value)
 */
	class Paiement extends \Eloquent {}
}

namespace App\Models{
/**
 * @property string $id
 * @property string $email
 * @property string $code
 * @property \Illuminate\Support\Carbon $expires_at
 * @property bool $used
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PasswordReset forEmail(string $email)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PasswordReset newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PasswordReset newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PasswordReset query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PasswordReset valid()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PasswordReset whereCode($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PasswordReset whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PasswordReset whereEmail($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PasswordReset whereExpiresAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PasswordReset whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PasswordReset whereUpdatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PasswordReset whereUsed($value)
 */
	class PasswordReset extends \Eloquent {}
}

namespace App\Models{
/**
 * @property string $id
 * @property string $utilisateur_id
 * @property string $nom
 * @property string $prenom
 * @property string|null $email
 * @property string|null $adresse
 * @property string $contact
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property-read \App\Models\Administrateur|null $administrateur
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\AutoEcole> $autoEcoles
 * @property-read int|null $auto_ecoles_count
 * @property-read \App\Models\Candidat|null $candidat
 * @property-read \App\Models\Utilisateur $utilisateur
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Personne newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Personne newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Personne query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Personne whereAdresse($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Personne whereContact($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Personne whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Personne whereEmail($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Personne whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Personne whereNom($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Personne wherePrenom($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Personne whereUpdatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Personne whereUtilisateurId($value)
 */
	class Personne extends \Eloquent {}
}

namespace App\Models{
/**
 * @property string $id
 * @property string|null $type_document_id
 * @property string|null $code
 * @property string|null $libelle
 * @property string|null $format_attendu
 * @property bool $obligatoire
 * @property string|null $delivery_date
 * @property string|null $expiration_date
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property string $etape_id
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\Document> $documents
 * @property-read int|null $documents_count
 * @property-read \App\Models\Referentiel|null $typeDocument
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PieceJustificative newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PieceJustificative newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PieceJustificative query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PieceJustificative whereCode($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PieceJustificative whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PieceJustificative whereDeliveryDate($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PieceJustificative whereEtapeId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PieceJustificative whereExpirationDate($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PieceJustificative whereFormatAttendu($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PieceJustificative whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PieceJustificative whereLibelle($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PieceJustificative whereObligatoire($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PieceJustificative whereTypeDocumentId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PieceJustificative whereUpdatedAt($value)
 */
	class PieceJustificative extends \Eloquent {}
}

namespace App\Models{
/**
 * @property string $id
 * @property string $dossier_id
 * @property \Illuminate\Support\Carbon $date_examen
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property-read \App\Models\Dossier $dossier
 * @method static \Illuminate\Database\Eloquent\Builder<static>|ProgrammeSession newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|ProgrammeSession newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|ProgrammeSession query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|ProgrammeSession whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|ProgrammeSession whereDateExamen($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|ProgrammeSession whereDossierId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|ProgrammeSession whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|ProgrammeSession whereUpdatedAt($value)
 */
	class ProgrammeSession extends \Eloquent {}
}

namespace App\Models{
/**
 * @property string $id
 * @property string $utilisateur_id
 * @property string $endpoint
 * @property string|null $public_key
 * @property string|null $auth_token
 * @property string|null $content_encoding
 * @property string|null $user_agent
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property-read \App\Models\Utilisateur $utilisateur
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PushSubscription newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PushSubscription newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PushSubscription query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PushSubscription whereAuthToken($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PushSubscription whereContentEncoding($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PushSubscription whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PushSubscription whereEndpoint($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PushSubscription whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PushSubscription wherePublicKey($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PushSubscription whereUpdatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PushSubscription whereUserAgent($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PushSubscription whereUtilisateurId($value)
 */
	class PushSubscription extends \Eloquent {}
}

namespace App\Models{
/**
 * @property string $id
 * @property string $libelle
 * @property string $code
 * @property string $type_ref
 * @property string|null $description
 * @property bool $statut
 * @property float|null $montant
 * @property string|null $type_demande
 * @property string|null $type_permis
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\AutoEcole> $auto_ecole
 * @property-read int|null $auto_ecole_count
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\Document> $documents
 * @property-read int|null $documents_count
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\FormationAutoEcole> $formationsSession
 * @property-read int|null $formations_session_count
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\FormationAutoEcole> $formationsTypePermis
 * @property-read int|null $formations_type_permis_count
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\PieceJustificative> $piecesJustificativesInscription
 * @property-read int|null $pieces_justificatives_inscription_count
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\PieceJustificative> $piecesJustificativesTypeDocument
 * @property-read int|null $pieces_justificatives_type_document_count
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\PieceJustificative> $piecesJustificativesTypePermis
 * @property-read int|null $pieces_justificatives_type_permis_count
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Referentiel newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Referentiel newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Referentiel query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Referentiel whereCode($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Referentiel whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Referentiel whereDescription($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Referentiel whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Referentiel whereLibelle($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Referentiel whereStatut($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Referentiel whereTypeRef($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Referentiel whereUpdatedAt($value)
 */
	class Referentiel extends \Eloquent {}
}

namespace App\Models{
/**
 * @property string $id
 * @property string $typeExamen
 * @property string $statut
 * @property string|null $commentaire
 * @property \Illuminate\Support\Carbon $date
 * @property string $dossier_id
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property-read \App\Models\Dossier $dossier
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Resultat newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Resultat newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Resultat query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Resultat whereCommentaire($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Resultat whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Resultat whereDate($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Resultat whereDossierId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Resultat whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Resultat whereStatut($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Resultat whereTypeExamen($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Resultat whereUpdatedAt($value)
 */
	class Resultat extends \Eloquent {}
}

namespace App\Models{
/**
 * @property string $code
 * @property string $libelle
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\HabilitationEtape> $habilitations
 * @property-read int|null $habilitations_count
 * @method static \Database\Factories\RoleFactory factory($count = null, $state = [])
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Role newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Role newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Role query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Role whereCode($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Role whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Role whereLibelle($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Role whereUpdatedAt($value)
 */
	class Role extends \Eloquent {}
}

namespace App\Models{
/**
 * @property string $id
 * @property string $message
 * @property string $role
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SocketMessage newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SocketMessage newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SocketMessage query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SocketMessage whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SocketMessage whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SocketMessage whereMessage($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SocketMessage whereRole($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SocketMessage whereUpdatedAt($value)
 */
	class SocketMessage extends \Eloquent {}
}

namespace App\Models{
/**
 * @property string $id
 * @property string $libelle
 * @property bool $final
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property string $code
 * @property bool $annulable
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\Etape> $etapes
 * @property-read int|null $etapes_count
 * @method static \Database\Factories\StatutFactory factory($count = null, $state = [])
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Statut newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Statut newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Statut query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Statut whereAnnulable($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Statut whereCode($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Statut whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Statut whereFinal($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Statut whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Statut whereLibelle($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Statut whereUpdatedAt($value)
 */
	class Statut extends \Eloquent {}
}

namespace App\Models{
/**
 * @property string $id
 * @property string $code
 * @property string $libelle
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property string $source_etape_id
 * @property string $cible_etape_id
 * @property string|null $circuit_id
 * @property-read \App\Models\Etape $cible
 * @property-read \App\Models\Circuit|null $circuit
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\JournalTransition> $journaux
 * @property-read int|null $journaux_count
 * @property-read \App\Models\Etape $source
 * @method static \Database\Factories\TransitionFactory factory($count = null, $state = [])
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Transition newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Transition newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Transition query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Transition whereCibleEtapeId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Transition whereCircuitId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Transition whereCode($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Transition whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Transition whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Transition whereLibelle($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Transition whereSourceEtapeId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Transition whereUpdatedAt($value)
 */
	class Transition extends \Eloquent {}
}

namespace App\Models{
/**
 * @property string $id
 * @property string $name
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @method static \Illuminate\Database\Eloquent\Builder<static>|TypeDemande newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|TypeDemande newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|TypeDemande query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|TypeDemande whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|TypeDemande whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|TypeDemande whereName($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|TypeDemande whereUpdatedAt($value)
 */
	class TypeDemande extends \Eloquent {}
}

namespace App\Models{
/**
 * @property string $id
 * @property string|null $email
 * @property string $password
 * @property string|null $role
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property string $telephone
 * @property \Illuminate\Support\Carbon|null $verified_at
 * @property string|null $remember_token
 * @property-read \Illuminate\Notifications\DatabaseNotificationCollection<int, \Illuminate\Notifications\DatabaseNotification> $notifications
 * @property-read int|null $notifications_count
 * @property-read \App\Models\Personne|null $personne
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\PushSubscription> $pushSubscriptions
 * @property-read int|null $push_subscriptions_count
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Utilisateur newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Utilisateur newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Utilisateur query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Utilisateur whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Utilisateur whereEmail($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Utilisateur whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Utilisateur wherePassword($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Utilisateur whereRememberToken($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Utilisateur whereRole($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Utilisateur whereTelephone($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Utilisateur whereUpdatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Utilisateur whereVerifiedAt($value)
 */
	class Utilisateur extends \Eloquent {}
}

namespace App\Models{
/**
 * @property string $id
 * @property string $utilisateur_id
 * @property string $method
 * @property string $code_hash
 * @property \Illuminate\Support\Carbon $expires_at
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property-read \App\Models\Utilisateur $utilisateur
 * @method static \Illuminate\Database\Eloquent\Builder<static>|VerificationCode newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|VerificationCode newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|VerificationCode query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|VerificationCode whereCodeHash($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|VerificationCode whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|VerificationCode whereExpiresAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|VerificationCode whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|VerificationCode whereMethod($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|VerificationCode whereUpdatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|VerificationCode whereUtilisateurId($value)
 */
	class VerificationCode extends \Eloquent {}
}

