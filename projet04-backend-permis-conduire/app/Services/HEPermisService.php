<?php

namespace App\Services;

use App\Models\HEPermis;
use Illuminate\Support\Carbon;
class HEPermisService
{
    public function createPermis(array $data)
    {
        return HEPermis::create($data);
    }

    public function getAll()
    {
        return HEPermis::all();
    }

    public function searchByName(?string $nomOrNumeroPermis)
    {
        if ($nomOrNumeroPermis) {
            $query = HEPermis::query();
            $query->where('nom', 'LIKE', '%' . $nomOrNumeroPermis . '%')
                ->orWhere('numero_permis', 'LIKE', '%' . $nomOrNumeroPermis . '%');
            return $query->get();
        }
        return null;
    }
}