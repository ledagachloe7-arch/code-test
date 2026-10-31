import axiosClient from "../../../shared/utils/axiosConfig";
import { Referentiel, ReferentielFormulaire } from "../../../shared/model/referentiel";
export class ReferentielService {
  async getReferentiels(): Promise<Referentiel[]> {
    try {
      const response = await axiosClient.get("referentiels");
      return response.data.data
        ; // On ne retourne que les données
    } catch (error: any) {
      console.error("Erreur de récupération des référentiels :", error);

      // Si Axios a une réponse du serveur (ex: 422, 404)
      if (error.response) {
        throw new Error(
          `Erreur ${error.response.status} : ${JSON.stringify(error.response.data)}`
        );
      }

      // Sinon (erreur réseau ou autre)
      throw new Error(`Erreur réseau : ${error.message}`);
    }
  }

  async saveReferentiels(referentiel: ReferentielFormulaire): Promise<Referentiel> {
    try {
      return await axiosClient.post("referentiels", {
        "libelle": referentiel.libelle,
        "code": referentiel.code,
        "type_ref": referentiel.type_ref,
        "description": referentiel.description,
        "statut": true
      });
    } catch (error: any) {
      throw new Error(`Erreur de savegarde: ${error.message}`);
    }
  }
  async deleteReferentiels(referentiel: Referentiel): Promise<void> {
    try {
      return await axiosClient.delete("referentiels/" + referentiel.id,);
    } catch (error: any) {
      throw new Error(`Erreur de savegarde: ${error.message}`);
    }
  }
  async updateReferentiels(referentiel: Referentiel): Promise<Referentiel> {
    try {
      return await axiosClient.put("referentiels/"+referentiel.id, {
        "libelle": referentiel.libelle,
        "description": referentiel.description,
        "statut": true
      });
    } catch (error: any) {
      throw new Error(`Erreur de savegarde: ${error.message}`);
    }
  }
  //   async deleteReferentiels(referentiel: Referentiel): Promise<void> {
  //   try {
  //     return await axiosClient.delete("referentiels/"+referentiel.id, );
  //   } catch (error: any) {
  //     throw new Error(`Erreur de savegarde: ${error.message}`);
  //   }
  // }

}



export const referentielService = new ReferentielService();