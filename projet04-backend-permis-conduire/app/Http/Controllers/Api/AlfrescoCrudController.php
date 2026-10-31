<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\AlfrescoCrudService;
use Barryvdh\DomPDF\Facade\Pdf;
use Dedoc\Scramble\Attributes\Group;
use Illuminate\Http\Request;

#[Group('Alfresco', description: 'Upload et gestion de fichiers via Alfresco. Upload, téléchargement, suppression de fichiers.')]
class AlfrescoCrudController extends Controller
{
    protected $alfresco;

    public function __construct(AlfrescoCrudService $alfresco)
    {
        $this->alfresco = $alfresco;
    }

    /** Upload un fichier vers Alfresco. Body : file (fichier multipart). */
    public function uploadFile(Request $request)
    {
        $path = $request->file('file')->getRealPath();
        //$this->alfresco->uploadFile('-my-', $path);
        return response()->json($this->alfresco->uploadFile('-my-', $path));
    }

    public function deleteNode($nodeId)
    {
        return response()->json($this->alfresco->deleteNode($nodeId));
    }


    public function openFile($nodeId)
    {
        return $this->alfresco->openFile($nodeId);
    }

    public function searchFolderByName($name)
    {
        $res = $this->alfresco->searchFolderByName($name);
        echo $res;
        return null;
    }

    public function uploadInFolder(Request $request)
    {
        return $this->alfresco->uploadSimple(
            $request,
            dossier: 'DECLARATION_CNI',
            uuid: '550e8400-e29b-41d4-a716-446655440000',
            nomUsage: 'DUPONT'
        );

    }

    public function readFile($name)
    {
        return $this->alfresco->readFile($name);
    }

    public function downloadFile()
    {
        return $this->alfresco->createArborescence(
            dossier: 'DECLARATION_CNI',
            uuid: '550e8400-e29b-41d4-a716-446655440000',
            nomUsage: 'DUPONT'
        );
    }

   
}
