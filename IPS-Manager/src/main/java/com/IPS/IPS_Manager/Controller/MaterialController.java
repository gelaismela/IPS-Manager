package com.IPS.IPS_Manager.Controller;

import com.IPS.IPS_Manager.Entity.Material;
import com.IPS.IPS_Manager.Repository.MaterialRepo;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/materials")
public class MaterialController {

    private final MaterialRepo materialRepo;

    public MaterialController(MaterialRepo materialRepo) {
        this.materialRepo = materialRepo;
    }

    @GetMapping("/all")
    public List<Material> getAllMaterials(){
        return materialRepo.findAll();
    }

    @GetMapping("/{Id}")
    public Material findMaterial(@PathVariable  String Id){
        return materialRepo.findById(Id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build()).getBody();
    }

    @PostMapping("/add")
    public Material addMaterial(@RequestBody Material newMaterial){
        return this.materialRepo.save(newMaterial);
    }


}
