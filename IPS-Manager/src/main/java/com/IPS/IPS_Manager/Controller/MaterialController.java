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

    @PutMapping("/update")
    public ResponseEntity<Material> updateMaterial(@RequestBody Material updatedMaterial) {
        return materialRepo.findById(updatedMaterial.getId())
                .map(existing -> {
                    existing.setName(updatedMaterial.getName());
                    existing.setUnit(updatedMaterial.getUnit());
                    // existing.setQuantity(updatedMaterial.getQuantity()); // if you have this field
                    return ResponseEntity.ok(materialRepo.save(existing));
                })
                .orElse(ResponseEntity.notFound().build());
    }


    @PostMapping("/add")
    public Material addMaterial(@RequestBody Material newMaterial){
        return this.materialRepo.save(newMaterial);
    }


    @PutMapping("/{id}")
    public ResponseEntity<Material> updateMaterial(@PathVariable String id, @RequestBody Material updatedMaterial) {
        return materialRepo.findById(id)
                .map(existing -> {
                    existing.setName(updatedMaterial.getName());
                    existing.setUnit(updatedMaterial.getUnit());
                    // uncomment if your Material entity has a quantity field:
                    existing.setQuantity(updatedMaterial.getQuantity());
                    return ResponseEntity.ok(materialRepo.save(existing));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteMaterial(@PathVariable String id) {
        if (!materialRepo.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        materialRepo.deleteById(id);
        return ResponseEntity.noContent().build();
    }

}
