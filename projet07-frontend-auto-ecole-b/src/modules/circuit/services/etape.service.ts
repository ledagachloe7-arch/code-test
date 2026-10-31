import axiosClient from '../../../shared/utils/axiosConfig';
import { Etape } from '../types/etape'

export class EtapeService {
  private url = '/workflow/etapes'

  async getByCircuitId(circuitId: string): Promise<Etape[]> {
    const res = await axiosClient.get(`${this.url}?circuit_id=${circuitId}`)
    return res.data
  }

  async create(payload: Partial<Etape>): Promise<Etape> {
    const res = await axiosClient.post(this.url, payload)
    return res.data
  }

  async remove(id: string): Promise<void> {
    await axiosClient.delete(`${this.url}/${id}`)
  }

  async update(id: string, payload: Partial<Etape>): Promise<Etape> {
    const res = await axiosClient.put(`${this.url}/${id}`, payload)
    return res.data
  }
}

export const etapeService = new EtapeService()