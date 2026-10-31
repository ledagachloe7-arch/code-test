<?php

namespace App\Http\Controllers;

use App\Models\ChangePermis;
use Illuminate\Http\Request;
use App\Services\ChangePermisService;

class ChangePermisController extends Controller
{

     protected $changePermisService;

    public function __construct(ChangePermisService $changePermisService)
    {
        $this->changePermisService = $changePermisService;
    }
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        //
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
       
        return $this->changePermisService->createChangePermis($request->all());
    }

    /**
     * Display the specified resource.
     */
    public function show(ChangePermis $changePermis)
    {
        //
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(ChangePermis $changePermis)
    {
        //
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, ChangePermis $changePermis)
    {
        //
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(ChangePermis $changePermis)
    {
        //
    }
}
