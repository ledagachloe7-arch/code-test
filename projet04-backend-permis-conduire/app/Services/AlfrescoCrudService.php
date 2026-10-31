<?php

namespace App\Services;

use GuzzleHttp\Client;
use Illuminate\Support\Carbon;
use GuzzleHttp\Exception\RequestException;
use Illuminate\Support\Facades\Http; // ✅ AJOUTE CETTE LIGNE

class AlfrescoCrudService
{
    protected $client;
    protected $baseUrl;
    protected $auth;


    public function __construct()
    {
        $this->baseUrl = env('ALFRESCO_URL', 'http://62.171.169.115:8080');
        // $this->baseUrl = env('ALFRESCO_URL', 'http://localhost:8080');
        $this->auth = [
            'username' => env('ALFRESCO_USER', 'admin'),
            'password' => env('ALFRESCO_PASS', 'admin'),
        ];

        $this->client = new Client([
            'base_uri' => $this->baseUrl,
            'auth' => [$this->auth['username'], $this->auth['password']],
        ]);
    }

    /**
     * 📂 Créer un dossier
     */
    public function createFolder($parentId = '-my-', $name)
    {

        return $this->request('POST', "/alfresco/api/-default-/public/alfresco/versions/1/nodes/$parentId/children", [
            'json' => [
                'name' => $name,
                'nodeType' => 'cm:folder',
            ]
        ]);
    }
    //Create Folder
    public function getOrCreateFolder($parentId, $name)
    {

        $idFolder = "";
        // 1️⃣ Sécuriser le nom pour éviter les problèmes AFTS
        $safeName = preg_replace('/[^A-Za-z0-9 _-]/', '_', $name);

        // 2️⃣ Vérifier si le dossier existe déjà sous le parent
        $response = $this->request('POST', "/alfresco/api/-default-/public/alfresco/versions/1/nodes/$parentId/children", [
            'json' => [
                'name' => $safeName,
                'nodeType' => 'cm:folder',
            ]
        ]);

        if (!empty($response['entry']['id'])) {

            // ❌ entries vide → dossier inexistant
            $idFolder = $response['entry']['id'];
        } else {
            // dd("id du site : " . $safeName);
            $nodeIdSite = $this->getDocumentsInSite($parentId);
            // dd("nodeId : " . $nodeIdSite);
            $idFolder = $this->findFolderByNameGlobal($safeName);
            if (empty($idFolder) && $nodeIdSite != null) {
                // 3️⃣ Créer le dossier s'il n'existe pas
                $idFolder = $nodeIdSite;
                // dd("Dossier existant du site: " . $idFolder);
            }


        }
        return $idFolder;
    }

    public function getDocumentsInSite(string $siteId)
    {
        try {
            $response = $this->request(
                'GET',
                "/alfresco/api/-default-/public/alfresco/versions/1/nodes/{$siteId}/children"
            );
            return $response['list']['entries'][0]['entry']['id'];

        } catch (\Exception $e) {
            return ["error" => $e->getMessage()];
        }
    }
    public function findFolderByNameGlobal(string $folderName): ?string
    {

        try {
            $response = $this->request(
                'POST',
                '/alfresco/api/-default-/public/search/versions/1/search',
                [
                    'json' => [
                        'query' => [
                            'language' => 'afts',
                            'query' => "TYPE:'cm:folder' AND cm:name:" . $folderName
                        ],
                        'paging' => [
                            'maxItems' => 100
                        ]
                    ]
                ]
            );
            // dd($folderName);
            // ✅ Vérifier que entries n'est pas vide
            if (!empty($response['list']['entries']) && isset($response['list']['entries'][0]['entry']['id'])) {
                return $response['list']['entries'][0]['entry']['id'];
            }
            // Si aucun dossier trouvé
            return null;
        } catch (\Exception $e) {
            dd($e->getMessage());
        }
    }


    // Chemin AFTS vers la documentLibrary du site
    public function findFolderByNameInSite(string $folderName): ?string
    {
        // $siteId = 'permisconduiredev';
        $siteId = 'permisconduiredev';
        // Sécurisation du nom

        $safeName = preg_replace('/[^A-Za-z0-9 _-]/', '_', $folderName);

        $response = $this->request(
            'POST',
            "/alfresco/api/-default-/public/search/versions/1/search",
            [
                'json' => [
                    'query' => [
                        'language' => 'afts',
                        'query' => "TYPE:'cm:folder' AND cm:name:" . $safeName . " AND PATH:'/Sites/{$siteId}/documentLibrary/*'"
                    ],
                    'paging' => [
                        'maxItems' => 1
                    ]
                ]
            ]
        );
        // dd($response);
        // ✅ Vérifier que entries n'est pas vide
        if (!empty($response['list']['entries']) && isset($response['list']['entries'][0]['entry']['id'])) {
            return $response['list']['entries'][0]['entry']['id'];
        }

        // Si aucun dossier trouvé
        return null;
    }



    //Méthode principale : créer l’arborescence complète
    public function createArborescence(
        string $dossier,
        string $uuid,
        
        string $nomUsage,

    ) {
        $year = Carbon::now()->year;
        $month = now()->month;
        //recuperer l'id du site 
        $siteId = $this->uploadToSite();
        // dd($siteId);
        // permis_conduire
        $permisId = $this->getOrCreateFolder($siteId, "permis_conduire");

        // dossier
        $dossierId = $this->getOrCreateFolder($permisId, $dossier);

        // dossier/année
        $anneeId = $this->getOrCreateFolder($dossierId, $year);

        // dossier/année/mois
        $moisId = $this->getOrCreateFolder($anneeId, "MOIS " . $month);
       
        // dossier final
        $finalName = "{$uuid}_{$nomUsage}";
        
        $finalId = $this->getOrCreateFolder($moisId, $finalName);
        
        return $finalId;
    }


    /**
     * 📜 Lister les éléments d’un dossier
     */
    public function listChildren($nodeId = '-my-')
    {
        return $this->request('GET', "/alfresco/api/-default-/public/alfresco/versions/1/nodes/$nodeId/children");
    }

    /**
     * 📁 Uploader un fichier
     */
    public function uploadFile($parentId, $filePath)
    {
        return $this->request('POST', "/alfresco/api/-default-/public/alfresco/versions/1/nodes/$parentId/children", [
            'multipart' => [
                [
                    'name' => 'filedata',
                    'contents' => fopen($filePath, 'r'),
                    'filename' => basename($filePath),
                ],
            ],
        ]);
    }


    /**
     * 🗑️ Supprimer un fichier ou dossier
     */
    public function deleteNode($nodeId)
    {
        return $this->request('DELETE', "/alfresco/api/-default-/public/alfresco/versions/1/nodes/$nodeId");
    }
    //ok
    public function openFile($nodeId)
    {

        try {
            $alfrescoUrl = $this->baseUrl . "/alfresco/api/-default-/public/alfresco/versions/1/nodes/$nodeId/content";

            //🔐 Authentification Alfresco
            $response = Http::withBasicAuth($this->auth['username'], $this->auth['password'])
                //->withOptions(['stream' => true]) // important pour les fichiers binaires
                ->get($alfrescoUrl);
            //$response = $this->request('GET', "/alfresco/api/-default-/public/alfresco/versions/1/nodes/$nodeId/content");

            // ❌ Si Alfresco ne répond pas correctement
            if ($response->failed()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Impossible de récupérer le fichier depuis Alfresco.',
                    'status' => $response->status(),
                ], $response->status());
            }
            header('Content-Type: ' . $response->header('Content-Type'));
            echo $response->body();
            return $response->body();


        } catch (\Throwable $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur interne : ' . $e->getMessage(),
            ], 500);
        }

    }
    public function searchFolderByName($folderName)
    {
        $apiUrl = env('ALFRESCO_URL');
        $response = Http::withBasicAuth('admin', 'admin')
            ->post($apiUrl . '/alfresco/api/-default-/public/search/versions/1/search', [
                'query' => [
                    'query' => 'cm:name:"' . $folderName . '" AND TYPE:"cm:folder"'
                ]
            ]);

        if ($response->failed()) {
            return response()->json(['error' => 'Erreur de recherche', 'details' => $response->json()], 500);
        }

        $data = $response->json();

        if (empty($data['list']['entries'])) {
            return response()->json(['message' => 'Aucun dossier trouvé']);
        }

        // Si tu veux renvoyer juste le premier résultat
        $folder = $data['list']['entries'][0]['entry'];

        return response()->json([
            'id' => $folder['id'],
            'name' => $folder['name'],
            'path' => $folder['path']['name'] ?? ''
        ]);
    }
    //ok
    public function uploadSimple(
        $request,
        $dossier,
        $uuid,
        $nomUsage
    ) {

        $request->validate([
            'fichier' => 'required|file'
        ]);

        $filePath = $request->file('fichier')->getRealPath();
        // $extension = $request->file('fichier')->getClientOriginalExtension();
        $fileName = $request->file('fichier')->getClientOriginalName();
        // 1️⃣ Créer l’arborescence complète et récupérer l’ID du dossier final
        $folderNodeId = $this->createArborescence(
            dossier: $dossier,
            uuid: $uuid,
            nomUsage: $nomUsage
        );

        // // 2️⃣ Upload du fichier dans ce dossier
        $uploadResponse = Http::withBasicAuth($this->auth['username'], $this->auth['password'])
            ->attach('filedata', file_get_contents($filePath), $fileName)
            ->post($this->baseUrl . "/alfresco/api/-default-/public/alfresco/versions/1/nodes/{$folderNodeId}/children", [
                'name' => uniqid() . '_' .$fileName,
                'nodeType' => 'cm:content'
            ]);

        if ($uploadResponse === null || $uploadResponse->failed()) {
            return [
                'error' => 'Échec de l\'upload du fichier. car le fichier existe déjà avec le même nom.',
            ];
        }

        $resultat = $uploadResponse->body();

        $json = json_decode($resultat, true);
        // ← array PHP
        // Vérifie si la conversion a réussi
        if (json_last_error() !== JSON_ERROR_NONE) {
            dd("Erreur JSON :", json_last_error_msg(), $resultat);
        }

        // // Maintenant tu peux récupérer l'id
        $fileId = (isset($json['entry']['id']) && isset($json['entry'])) ? $json['entry']['id'] : null;
        return [
            'fileId' => $fileId,
        ];
    }
    //ok
    public function readFile($folderName)
    {
        $apiUrl = env('ALFRESCO_URL');
        $response = Http::withBasicAuth($this->auth['username'], $this->auth['password'])
            ->post($apiUrl . '/alfresco/api/-default-/public/search/versions/1/search', [
                'query' => [
                    'query' => 'cm:name:"' . $folderName . '" AND TYPE:"cm:folder"'
                ]
            ]);

        $entries = $response->json()['list']['entries'] ?? [];
        //   dd( $entries);
        if (count($entries) === 0) {
            die("Dossier non trouvé !");
        }

        $folderNodeId = $entries[0]['entry']['id'];
        $childrenResponse = Http::withBasicAuth($this->auth['username'], $this->auth['password'])
            ->get($apiUrl . "/alfresco/api/-default-/public/alfresco/versions/1/nodes/{$folderNodeId}/children");

        $children = $childrenResponse->json()['list']['entries'] ?? [];

        foreach ($children as $child) {
            echo "Nom du fichier : " . $child['entry']['name'] . " | NodeId : " . $child['entry']['id'] . PHP_EOL;
        }
        // dd($folderNodeId);
    }
    /**
     * 🧠 Méthode utilitaire pour toutes les requêtes
     */
    private function request($method, $uri, $options = [])
    {
        try {
            $response = $this->client->request($method, $uri, $options);
            return json_decode($response->getBody(), true);
        } catch (RequestException $e) {
            return [
                'error' => $e->getMessage(),
                'response' => $e->hasResponse() ? $e->getResponse()->getBody()->getContents() : null,
            ];
        }
    }

    //verifier si le dossier existe

    public function uploadToSite()
    {
        // L'ID extrait de votre URL : permisconduire
        // $siteId = 'permisconduiredev';
        $siteId = 'permisconduiredev';
        // 2. Appeler l'API d'Alfresco pour voir les conteneurs du site
        // L'URL se termine par /sites/{votre-site}/containers/documentLibrary
        $response = Http::withBasicAuth($this->auth['username'], $this->auth['password'])
            ->get($this->baseUrl . "/alfresco/api/-default-/public/alfresco/versions/1/sites/{$siteId}/containers/documentLibrary");
        if ($response->successful()) {
            // 3. Extraire l'ID technique (le GUID)
            $folderId = $response->json()['entry']['id'];

            return $folderId;
            // Cet ID ressemblera à quelque chose comme : "70a68453-62c2-4806-b333-6902256f082e"
        }

        return null;
    }

    public function checkNodeExists(string $nodeId): bool
    {
        // L'URL cible le nœud spécifique directement via son ID technique
        $url = "{$this->baseUrl}/alfresco/api/-default-/public/alfresco/versions/1/nodes/{$nodeId}";

        $response = Http::withBasicAuth($this->auth['username'], $this->auth['password'])
            ->acceptJson()
            ->get($url);

        // Si le code est 200, le nœud existe
        if ($response->successful()) {
            // Optionnel : Vérifier qu'il s'agit bien d'un dossier ou d'un site
            $nodeType = $response->json('entry.nodeType');
            return true;
        }

        // Si 404, le nodeId est invalide ou a été supprimé
        if ($response->status() === 404) {

            return false;
        }

        return false;
    }


    public function getFolderByNodeId(string $nodeId)
    {
        $url = "{$this->baseUrl}/alfresco/api/-default-/public/alfresco/versions/1/nodes/{$nodeId}";

        $response = Http::withBasicAuth($this->auth['username'], $this->auth['password'])
            ->get($url, [
                'include' => 'path,properties,allowableOperations'
            ]);

        if ($response->successful()) {
            return $response->json('entry');
        }

        if ($response->status() === 404) {
            // Le dossier n'existe pas ou l'ID est incorrect
            return null;
        }

        return null;
    }
}
