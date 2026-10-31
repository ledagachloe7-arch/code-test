import axiosClient from '../../../shared/utils/axiosConfig'
import { Transition } from '../types/transition'

export class TransitionService {
  private url = '/workflow/transitions'

  async getByCircuitId(circuitId: string): Promise<any[]> {
    const res = await axiosClient.get(`${this.url}?circuit_id=${circuitId}`)
    return res.data
  }

  async create(payload: Partial<Transition>): Promise<Transition> {
    const res = await axiosClient.post(this.url, payload)
    return res.data
  }

  async remove(id: string): Promise<void> {
    await axiosClient.delete(`${this.url}/${id}`)
  }
}

export const transitionService = new TransitionService()
