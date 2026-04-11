import { DocumentController } from "./documents.controller";
import { InjectCls, TRouter } from "../../helpers";
import { AuthMiddleware } from "../../middlewares";
import { Validator } from "../../helpers";
import { CreatePUCDto } from "./dto";

export class DocumentRouter extends TRouter {
  @InjectCls(DocumentController)
  private documentController: DocumentController;

  @InjectCls(AuthMiddleware)
  private authMiddleware: AuthMiddleware;

  initRoutes(): void {
    this.router.get(
      "/puc",
      this.authMiddleware.auth,
      this.documentController.getDocuments
    );
    this.router.post(
      "/puc",
      Validator.validate(CreatePUCDto),
      this.authMiddleware.auth,
      this.documentController.addDocument
    );
    this.router.delete(
      "/puc/:id",
      this.authMiddleware.auth,
      this.documentController.deleteDocument
    );
    this.router.get(
      "/stats",
      this.authMiddleware.auth,
      this.documentController.getDocumentStats
    );
    this.router.put(
      "/puc/:id",
      Validator.validate(CreatePUCDto),
      this.authMiddleware.auth,
      this.documentController.updateDocument
    );
    this.router.get(
      "/puc/export",
      this.authMiddleware.auth,
      this.documentController.exportPUCDocuments
    );
    this.router.get(
      "/puc/:id",
      this.authMiddleware.auth,
      this.documentController.getDocument
    );
    this.router.get(
      "/search",
      this.authMiddleware.auth,
      this.documentController.searchDocuments
    );
  }
}
