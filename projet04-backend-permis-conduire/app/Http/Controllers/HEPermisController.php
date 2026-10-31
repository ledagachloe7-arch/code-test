<?php

namespace App\Http\Controllers;

use App\Models\HEPermis;
use Illuminate\Http\Request;
use App\Services\HEPermisService;
class HEPermisController extends Controller
{
        protected $permisService;

    public function __construct(HEPermisService $permisService)
    {
        $this->permisService = $permisService;
    }
    /**
     * Display a listing of the resource.
     */
    public function index($request)
    {
        $resultats = $this->permisService->searchByName($request);
        return response()->json($resultats, 200);
    }

    /**
     * Show the form for creating a new resource.
     */
    public function create()
    {
        //
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
      
        $permis = $this->permisService->createPermis($request->all());
        return response()->json($permis, 201);
    }

    /**
     * Display the specified resource.
     */
    public function show(HEPermis $hEPermis)
    {
        //
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(HEPermis $hEPermis)
    {
        //
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, HEPermis $hEPermis)
    {
        //
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(HEPermis $hEPermis)
    {
        //
    }
}
